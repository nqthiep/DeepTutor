"""
Subjects API Router — admin CRUD + learner list.

Mounted at ``/api/v1/subjects``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from deeptutor.services.auth.dependencies import get_current_user, require_role
from deeptutor.services.subject import get_subject_service
from deeptutor.services.subject.service import SubjectExistsError, SubjectNotFoundError

router = APIRouter()


class SubjectPayload(BaseModel):
    id: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-z][a-z0-9_-]*$")
    name: str = Field(..., min_length=1, max_length=64)
    icon: str = "book-open"
    color: str = "#6b7280"
    description: str = ""
    enabled: bool = True
    sort_order: int = 0


class SubjectUpdatePayload(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None
    description: str | None = None
    enabled: bool | None = None
    sort_order: int | None = None


# ── Learner endpoints ───────────────────────────────────────────────


@router.get("")
async def list_subjects(user: dict = Depends(get_current_user)) -> dict:
    svc = get_subject_service()
    role = user.get("role", "learner")
    if role in ("administrator", "manager"):
        return {"subjects": svc.list_all()}
    return {"subjects": svc.list_enabled()}


# ── Admin / Manager endpoints ───────────────────────────────────────


@router.post("")
async def create_subject(payload: SubjectPayload, user: dict = Depends(require_role("administrator", "manager"))) -> dict:
    svc = get_subject_service()
    try:
        subject = svc.create(payload.model_dump())
        return {"subject": subject}
    except SubjectExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.put("/{subject_id}")
async def update_subject(subject_id: str, payload: SubjectUpdatePayload, user: dict = Depends(require_role("administrator", "manager"))) -> dict:
    svc = get_subject_service()
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    try:
        subject = svc.update(subject_id, updates)
        return {"subject": subject}
    except SubjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/{subject_id}")
async def delete_subject(subject_id: str, user: dict = Depends(require_role("administrator"))) -> dict:
    svc = get_subject_service()
    try:
        svc.delete(subject_id)
        return {"status": "deleted", "id": subject_id}
    except SubjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/{subject_id}/toggle")
async def toggle_subject(subject_id: str, user: dict = Depends(require_role("administrator", "manager"))) -> dict:
    svc = get_subject_service()
    try:
        subject = svc.toggle(subject_id)
        return {"subject": subject}
    except SubjectNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
