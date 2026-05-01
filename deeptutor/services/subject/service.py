"""
subject/service.py — JSON-file-backed subject store.

Subjects are stored at ``data/user/settings/subjects.json``.
Admin-only CRUD; learners list only enabled subjects.
"""

from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from typing import Any

from deeptutor.services.path_service import get_path_service

DEFAULT_SUBJECTS: list[dict[str, Any]] = [
    {"id": "math", "name": "Mathematics", "icon": "calculator", "color": "#3b82f6", "description": "Numbers, equations, and problem solving", "enabled": True, "sort_order": 1},
    {"id": "physics", "name": "Physics", "icon": "atom", "color": "#ef4444", "description": "Matter, energy, and the laws of nature", "enabled": True, "sort_order": 2},
    {"id": "chemistry", "name": "Chemistry", "icon": "flask", "color": "#8b5cf6", "description": "Elements, reactions, and compounds", "enabled": True, "sort_order": 3},
    {"id": "literature", "name": "Literature", "icon": "book-open", "color": "#ec4899", "description": "Poetry, prose, and critical analysis", "enabled": True, "sort_order": 4},
    {"id": "english", "name": "English", "icon": "globe", "color": "#f59e0b", "description": "Language skills, grammar, and communication", "enabled": True, "sort_order": 5},
]


class SubjectNotFoundError(KeyError):
    pass


class SubjectExistsError(ValueError):
    pass


class SubjectService:
    def __init__(self) -> None:
        self._lock = Lock()
        self._file: Path = get_path_service().get_settings_file("subjects")
        self._subjects: list[dict[str, Any]] = []

    # ── persistence ──────────────────────────────────────────────────

    def _load(self) -> list[dict[str, Any]]:
        if self._file.exists():
            try:
                with open(self._file, encoding="utf-8") as f:
                    return json.load(f) or []
            except Exception:
                pass
        return DEFAULT_SUBJECTS

    def _save(self, subjects: list[dict[str, Any]]) -> None:
        self._file.parent.mkdir(parents=True, exist_ok=True)
        with open(self._file, "w", encoding="utf-8") as f:
            json.dump(subjects, f, ensure_ascii=False, indent=2)

    # ── public API ──────────────────────────────────────────────────

    def list_all(self) -> list[dict[str, Any]]:
        with self._lock:
            self._subjects = self._load()
            return list(self._subjects)

    def list_enabled(self) -> list[dict[str, Any]]:
        return [s for s in self.list_all() if s.get("enabled", True)]

    def create(self, subject: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            subjects = self._load()
            if any(s["id"] == subject["id"] for s in subjects):
                raise SubjectExistsError(f"Subject '{subject['id']}' already exists")
            subjects.append(subject)
            self._save(subjects)
            return dict(subject)

    def update(self, subject_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            subjects = self._load()
            for s in subjects:
                if s["id"] == subject_id:
                    s.update(updates)
                    self._save(subjects)
                    return dict(s)
            raise SubjectNotFoundError(f"Subject '{subject_id}' not found")

    def delete(self, subject_id: str) -> None:
        with self._lock:
            subjects = self._load()
            new = [s for s in subjects if s["id"] != subject_id]
            if len(new) == len(subjects):
                raise SubjectNotFoundError(f"Subject '{subject_id}' not found")
            self._save(new)

    def toggle(self, subject_id: str) -> dict[str, Any]:
        with self._lock:
            subjects = self._load()
            for s in subjects:
                if s["id"] == subject_id:
                    s["enabled"] = not s.get("enabled", True)
                    self._save(subjects)
                    return dict(s)
            raise SubjectNotFoundError(f"Subject '{subject_id}' not found")


_instance: SubjectService | None = None


def get_subject_service() -> SubjectService:
    global _instance
    if _instance is None:
        _instance = SubjectService()
    return _instance
