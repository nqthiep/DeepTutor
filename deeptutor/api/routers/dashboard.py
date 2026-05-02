"""
Dashboard API — learner overview, admin recent activities.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from deeptutor.services.auth.dependencies import get_current_user, require_role
from deeptutor.services.memory import get_memory_service
from deeptutor.services.session import get_sqlite_session_store

router = APIRouter()


# ── helpers ──────────────────────────────────────────────────────


def _parse_section(text: str, section: str) -> str:
    """Extract a ## Section from markdown, returning the body (or '')."""
    m = re.search(rf"^## {section}\s*\n(.*?)(?=\n## |\Z)", text, re.MULTILINE | re.DOTALL)
    return m.group(1).strip() if m else ""


def _parse_profile(profile: str) -> dict[str, str]:
    return {
        "identity": _parse_section(profile, "Identity"),
        "learning_style": _parse_section(profile, "Learning Style"),
        "knowledge_level": _parse_section(profile, "Knowledge Level"),
        "preferences": _parse_section(profile, "Preferences"),
    }


def _parse_summary(summary: str) -> dict[str, str]:
    return {
        "current_focus": _parse_section(summary, "Current Focus"),
        "accomplishments": _parse_section(summary, "Accomplishments"),
        "open_questions": _parse_section(summary, "Open Questions"),
    }


def _build_daily_buckets() -> list[dict[str, Any]]:
    """Return a bucket for each of the last 7 days."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    buckets: list[dict[str, Any]] = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        buckets.append({"label": day.strftime("%a"), "date": start.isoformat(), "sessions": 0, "messages": 0})
    return buckets


def _fill_sessions_into_buckets(sessions: list[dict[str, Any]], buckets: list[dict[str, Any]]) -> None:
    from datetime import datetime, timezone

    for session in sessions:
        ts = session.get("updated_at") or session.get("created_at", 0)
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        for bucket in buckets:
            b_start = datetime.fromisoformat(bucket["date"])
            b_end = b_start.replace(hour=23, minute=59, second=59)
            if b_start <= dt <= b_end:
                bucket["sessions"] += 1
                bucket["messages"] += int(session.get("message_count", 0))
                break


def _compute_quiz_stats(entries: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(entries)
    correct = sum(1 for e in entries if e.get("is_correct"))
    by_difficulty: dict[str, dict[str, int]] = {}
    for e in entries:
        diff = str(e.get("difficulty") or "unknown").lower()
        if diff not in by_difficulty:
            by_difficulty[diff] = {"total": 0, "correct": 0}
        by_difficulty[diff]["total"] += 1
        if e.get("is_correct"):
            by_difficulty[diff]["correct"] += 1
    accuracy = round(correct / total * 100, 1) if total else 0.0
    return {
        "total": total,
        "correct": correct,
        "accuracy": accuracy,
        "by_difficulty": by_difficulty,
    }


def _aggregate_by_subject(sessions: list[dict[str, Any]], entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    from collections import OrderedDict

    subs: dict[str, dict[str, Any]] = OrderedDict()
    for s in sessions:
        pref = s.get("preferences", {})
        sid = str(pref.get("subject_id", "")) or "general"
        if sid not in subs:
            subs[sid] = {"id": sid, "sessions": 0, "quizzes": 0, "correct": 0}
        subs[sid]["sessions"] += 1

    # entries don't have subject_id — count total across all subjects
    # (quizzes can be assigned to a subject later)
    for e in entries:
        sid = "general"
        if sid not in subs:
            subs[sid] = {"id": sid, "sessions": 0, "quizzes": 0, "correct": 0}
        subs[sid]["quizzes"] += 1
        if e.get("is_correct"):
            subs[sid]["correct"] += 1

    result = []
    for v in subs.values():
        acc = round(v["correct"] / v["quizzes"] * 100, 1) if v["quizzes"] else 0.0
        result.append({"id": v["id"], "sessions": v["sessions"], "quizzes": v["quizzes"], "accuracy": acc})
    return result


def _list_books_with_progress(user_id: str) -> list[dict[str, Any]]:
    """Read book progress JSON files for the user."""
    books: list[dict[str, Any]] = []
    if not user_id:
        return books
    from deeptutor.services.path_service import get_path_service

    ps = get_path_service()
    book_root = ps.get_workspace_feature_dir("book")
    if not book_root.exists():
        return books

    for entry in sorted(book_root.iterdir()):
        if not entry.is_dir():
            continue
        progress_file = entry / "progress.json"
        manifest_file = entry / "manifest.json"
        if not progress_file.exists() or not manifest_file.exists():
            continue
        try:
            progress = json.loads(progress_file.read_text(encoding="utf-8"))
            manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
        except Exception:
            continue
        total_pages = manifest.get("page_count", 0)
        visited = progress.get("visited_page_ids", [])
        score = progress.get("score", 0)
        quests = len(progress.get("quiz_attempts", []))
        weak = progress.get("weak_chapters", [])
        books.append(
            {
                "id": entry.name.replace("book_", ""),
                "title": manifest.get("title", "Untitled"),
                "pages_visited": len(visited),
                "total_pages": total_pages,
                "quiz_score": score,
                "total_quizzes": quests,
                "weak_chapters": weak[:3],
            }
        )
    return books


# ── endpoints ────────────────────────────────────────────────────


@router.get("/overview")
async def get_learner_overview(user: dict = Depends(get_current_user)):
    """Learner dashboard overview — aggregated stats, memory, quiz performance."""
    user_id = str(user.get("id", ""))
    role = str(user.get("role", "learner"))

    store = get_sqlite_session_store()
    mem_svc = get_memory_service(user_id=user_id)

    # 1. Memory / Profile
    profile_raw = mem_svc.read_file("profile")
    summary_raw = mem_svc.read_file("summary")

    # 2. Sessions
    all_sessions = await store.list_sessions(limit=9999, user_id=user_id)
    total_sessions = len(all_sessions)
    total_messages = sum(int(s.get("message_count", 0)) for s in all_sessions)
    last_updated = max((s.get("updated_at", 0) or 0) for s in all_sessions) if all_sessions else 0

    buckets = _build_daily_buckets()
    _fill_sessions_into_buckets(all_sessions, buckets)

    last_active = (
        datetime.fromtimestamp(last_updated, tz=timezone.utc).isoformat() if last_updated else ""
    )

    # Sessions this week
    sessions_this_week = sum(b["sessions"] for b in buckets)

    # 3. Quiz performance
    entries_result = await store.list_notebook_entries(limit=9999)
    quiz = _compute_quiz_stats(entries_result.get("items", []))

    # 4. By subject
    by_subject = _aggregate_by_subject(all_sessions, entries_result.get("items", []))

    # 5. Books (only for learners if scoped)
    books = _list_books_with_progress(user_id) if role == "learner" else []

    return {
        "profile": _parse_profile(profile_raw),
        "summary": _parse_summary(summary_raw),
        "activity": {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "sessions_this_week": sessions_this_week,
            "last_active": last_active,
            "daily": buckets,
        },
        "quiz": quiz,
        "by_subject": by_subject,
        "books": books,
    }


# ── admin endpoints ────────────────────────────────────────────


@router.get("/recent")
async def get_recent_activities(
    limit: int = Query(default=50, ge=1, le=200),
    type: str | None = None,
    user: dict = Depends(require_role("administrator", "manager")),
):
    store = get_sqlite_session_store()
    sessions = await store.list_sessions(limit=limit, offset=0)
    activities: list[dict[str, Any]] = []

    for session in sessions:
        capability = str(session.get("capability") or "chat")
        activity_type = capability.replace("deep_", "")
        if type is not None and activity_type != type:
            continue
        activities.append(
            {
                "id": session.get("session_id"),
                "type": activity_type,
                "capability": capability,
                "title": session.get("title", "Untitled"),
                "timestamp": session.get("updated_at", session.get("created_at", 0)),
                "summary": (session.get("last_message") or "")[:160],
                "session_ref": f"sessions/{session.get('session_id')}",
                "message_count": session.get("message_count", 0),
                "status": session.get("status", "idle"),
                "active_turn_id": session.get("active_turn_id"),
            }
        )

    return activities[:limit]


@router.get("/{entry_id}")
async def get_activity_entry(
    entry_id: str,
    user: dict = Depends(require_role("administrator", "manager")),
):
    store = get_sqlite_session_store()
    session = await store.get_session_with_messages(entry_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Entry not found")

    capability = str(session.get("capability") or "chat")
    return {
        "id": session.get("session_id"),
        "type": capability.replace("deep_", ""),
        "capability": capability,
        "title": session.get("title"),
        "timestamp": session.get("updated_at", session.get("created_at")),
        "content": {
            "messages": session.get("messages", []),
            "active_turns": session.get("active_turns", []),
            "status": session.get("status", "idle"),
            "summary": session.get("compressed_summary", ""),
        },
    }
