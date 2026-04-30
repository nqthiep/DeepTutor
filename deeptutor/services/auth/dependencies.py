from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from deeptutor.services.auth.store import get_auth_store, AuthStore
from deeptutor.services.auth.tokens import decode_token

_security = HTTPBearer(auto_error=False)

VALID_ROLES = {"administrator", "manager", "learner"}


def require_role(
    *roles: str,
) -> Callable[[HTTPAuthorizationCredentials | None, AuthStore], Awaitable[dict]]:
    """FastAPI dependency: require the authenticated user to have one of *roles."""

    async def _check(
        credentials: HTTPAuthorizationCredentials | None = Depends(_security),
        store: AuthStore = Depends(get_auth_store),
    ) -> dict:
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        payload = decode_token(credentials.credentials)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = payload.get("sub")
        user_role = payload.get("role", "learner")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        user = store.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        if user_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {', '.join(roles)}",
            )
        return user

    return _check


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
    store: AuthStore = Depends(get_auth_store),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = store.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    user["role"] = payload.get("role", user.get("role", "learner"))
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
    store: AuthStore = Depends(get_auth_store),
) -> dict | None:
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return store.get_user_by_id(user_id)
