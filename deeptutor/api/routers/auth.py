from __future__ import annotations

import os
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status

from deeptutor.services.auth.dependencies import get_current_user, require_role
from deeptutor.services.auth.email import send_password_reset_email
from deeptutor.services.auth.password import hash_password, verify_password
from deeptutor.services.auth.schemas import (
    AdminCreateUserRequest,
    AdminUpdateRoleRequest,
    AdminUpdateUserRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LearnerProfileOut,
    LoginRequest,
    OnboardingRequest,
    OnboardingStatusResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserOut,
)
from deeptutor.services.auth.store import AuthStore, get_auth_store
from deeptutor.services.auth.tokens import (
    create_access_token,
    create_refresh_token,
    hash_token,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


@router.post("/register")
async def register(
    body: RegisterRequest,
    store: AuthStore = Depends(get_auth_store),
):
    role = body.role
    if role is not None and store.user_count() > 0:
        role = None
    try:
        user = store.create_user(
            email=body.email,
            password_hash=hash_password(body.password),
            display_name=body.display_name or body.email.split("@")[0],
            role=role,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    access_token = create_access_token(user["id"], role=user["role"])
    refresh_raw = create_refresh_token()
    refresh_expires = time.time() + TOKEN_EXPIRE_DAYS * 86400
    store.store_refresh_token(user["id"], hash_token(refresh_raw), refresh_expires)

    return {
        "user": UserOut(**user).model_dump(),
        "access_token": access_token,
        "refresh_token": refresh_raw,
    }


@router.post("/login")
async def login(
    body: LoginRequest,
    store: AuthStore = Depends(get_auth_store),
):
    user = store.get_user_by_email(body.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    pw_hash = store.get_password_hash(user["id"])
    if pw_hash is None or not verify_password(body.password, pw_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user["id"], role=user["role"])
    refresh_raw = create_refresh_token()
    refresh_expires = time.time() + TOKEN_EXPIRE_DAYS * 86400
    store.store_refresh_token(user["id"], hash_token(refresh_raw), refresh_expires)

    return {
        "user": UserOut(**user).model_dump(),
        "access_token": access_token,
        "refresh_token": refresh_raw,
    }


@router.post("/refresh")
async def refresh(
    body: RefreshRequest,
    store: AuthStore = Depends(get_auth_store),
):
    stored = store.verify_refresh_token(hash_token(body.refresh_token))
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    store.delete_refresh_token(hash_token(body.refresh_token))

    user = store.get_user_by_id(stored["user_id"])
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token(user["id"], role=user["role"])
    refresh_raw = create_refresh_token()
    refresh_expires = time.time() + TOKEN_EXPIRE_DAYS * 86400
    store.store_refresh_token(user["id"], hash_token(refresh_raw), refresh_expires)

    return {
        "access_token": access_token,
        "refresh_token": refresh_raw,
    }


@router.post("/logout")
async def logout(
    body: RefreshRequest,
    store: AuthStore = Depends(get_auth_store),
):
    store.delete_refresh_token(hash_token(body.refresh_token))
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    store: AuthStore = Depends(get_auth_store),
):
    user = store.get_user_by_email(body.email)
    if user is None:
        return {"message": "If the email exists, a reset link has been sent"}

    raw_token = create_refresh_token()
    expires_at = time.time() + 3600
    store.store_reset_token(user["id"], hash_token(raw_token), expires_at)

    frontend_url = os.getenv("FRONTEND_URL", str(request.base_url).replace("/api/", "/"))
    await send_password_reset_email(body.email, raw_token, frontend_url)

    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    store: AuthStore = Depends(get_auth_store),
):
    stored = store.verify_reset_token(hash_token(body.token))
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    store.update_password(stored["user_id"], hash_password(body.new_password))
    store.mark_reset_token_used(hash_token(body.token))
    store.delete_user_refresh_tokens(stored["user_id"])

    return {"message": "Password reset successfully"}


@router.get("/me")
async def get_me(
    user: dict = Depends(get_current_user),
):
    return UserOut(**user).model_dump()


@router.put("/me")
async def update_me(
    body: UpdateProfileRequest,
    user: dict = Depends(get_current_user),
    store: AuthStore = Depends(get_auth_store),
):
    updated = store.update_user(user["id"], display_name=body.display_name)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut(**updated).model_dump()


@router.put("/me/password")
async def change_own_password(
    body: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
    store: AuthStore = Depends(get_auth_store),
):
    pw_hash = store.get_password_hash(user["id"])
    if pw_hash is None or not verify_password(body.current_password, pw_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    store.update_password(user["id"], hash_password(body.new_password))
    store.delete_user_refresh_tokens(user["id"])
    return {"message": "Password changed successfully"}


# ─── Onboarding endpoints ──────────────────────────────────────────


@router.get("/onboarding-status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    user: dict = Depends(get_current_user),
    store: AuthStore = Depends(get_auth_store),
):
    return store.get_onboarding_status(user["id"])


@router.post("/onboarding", response_model=LearnerProfileOut)
async def complete_onboarding(
    body: OnboardingRequest,
    user: dict = Depends(get_current_user),
    store: AuthStore = Depends(get_auth_store),
):
    profile = store.complete_onboarding(user["id"], body.model_dump())
    # Write onboarding data to memory for AI agents to use
    try:
        from deeptutor.services.memory import get_memory_service
        mem_svc = get_memory_service(user_id=user["id"])
        _write_onboarding_to_memory(mem_svc, body)
    except Exception:
        pass
    return profile


def _write_onboarding_to_memory(mem_svc, body: OnboardingRequest) -> None:
    """Format onboarding data into PROFILE.md + SUMMARY.md for AI agent consumption."""
    interests = body.topics_of_interest.strip() or "various subjects"
    grade_info = ""
    if body.grade or body.age:
        parts = []
        if body.grade:
            parts.append(f"Grade: {body.grade}")
        if body.age:
            parts.append(f"Age: {body.age}")
        grade_info = " (" + ", ".join(parts) + ")" if parts else ""

    profile_md = (
        "## Identity\n"
        f"- Learning Goal: {body.purpose or 'Learning and self-improvement'}\n"
        f"- Background: {body.background or 'Not specified'}\n"
        f"- Areas of Interest: {interests}\n"
        f"- Student Info: Vietnamese K-12 student{grade_info}\n"
        "\n"
        f"## Learning Style\n"
        f"{body.learning_style or 'Not specified yet'}\n"
        "\n"
        f"## Knowledge Level\n"
        f"{body.current_level or 'Not assessed yet'}\n"
        "\n"
        "## Preferences\n"
        f"- Language: {body.language or 'en'}\n"
        f"- Expectations: {body.expectations or 'Not specified'}\n"
        f"- Time Commitment: {body.time_commitment or 'Not specified'}\n"
    )
    mem_svc.write_file("profile", profile_md)

    summary_md = (
        "## Current Focus\n"
        f"Getting started with DeepTutor. Exploring topics in {interests}.\n"
        "\n"
        "## Accomplishments\n"
        "- Completed onboarding and set up learning profile\n"
        "\n"
        "## Open Questions\n"
        "None yet. Ready to start learning!\n"
    )
    mem_svc.write_file("summary", summary_md)


@router.get("/onboarding", response_model=LearnerProfileOut)
async def get_onboarding_profile(
    user: dict = Depends(get_current_user),
    store: AuthStore = Depends(get_auth_store),
):
    profile = store.get_learner_profile(user["id"])
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Onboarding profile not found")
    return profile


# ─── Admin-only endpoints ─────────────────────────────────────────────


@router.get("/users")
async def list_users(
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    user: dict = Depends(require_role("administrator")),
    store: AuthStore = Depends(get_auth_store),
):
    users = store.list_all_users(search=search, role=role, is_active=is_active)
    return [UserOut(**u).model_dump() for u in users]


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    user: dict = Depends(require_role("administrator")),
    store: AuthStore = Depends(get_auth_store),
):
    u = store.get_user_by_id_including_inactive(user_id)
    if u is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut(**u).model_dump()


@router.post("/users")
async def create_user(
    body: AdminCreateUserRequest,
    user: dict = Depends(require_role("administrator")),
    store: AuthStore = Depends(get_auth_store),
):
    try:
        u = store.create_user_by_admin(
            email=body.email,
            password_hash=hash_password(body.password),
            display_name=body.display_name,
            role=body.role,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return UserOut(**u).model_dump()


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    body: AdminUpdateUserRequest,
    user: dict = Depends(require_role("administrator")),
    store: AuthStore = Depends(get_auth_store),
):
    try:
        updated = store.update_user_admin(
            user_id,
            display_name=body.display_name,
            email=body.email,
            role=body.role,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut(**updated).model_dump()


@router.put("/users/{user_id}/active")
async def toggle_user_active(
    user_id: str,
    user: dict = Depends(require_role("administrator")),
    store: AuthStore = Depends(get_auth_store),
):
    updated = store.toggle_user_active(user_id)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut(**updated).model_dump()


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    user: dict = Depends(require_role("administrator")),
    store: AuthStore = Depends(get_auth_store),
):
    u = store.get_user_by_id_including_inactive(user_id)
    if u is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    store.deactivate_user(user_id)
    return {"message": "User deactivated"}


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: AdminUpdateRoleRequest,
    user: dict = Depends(require_role("administrator")),
    store: AuthStore = Depends(get_auth_store),
):
    updated = store.update_user_role(user_id, body.role)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut(**updated).model_dump()
