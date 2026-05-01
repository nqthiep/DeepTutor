#!/usr/bin/env python
"""Migrate existing global data into per-user isolation layout.

Run once after upgrading to per-user data isolation.
Reads the first admin user ID from the database, then moves
all existing data under ``data/users/{admin_user_id}/``.

Usage:
    python scripts/migrate_user_data.py
"""

from __future__ import annotations

import json
import shutil
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

DATA_USER = PROJECT_ROOT / "data" / "user"
DATA_MEMORY = PROJECT_ROOT / "data" / "memory"
DATA_USERS = PROJECT_ROOT / "data" / "users"
DB_PATH = DATA_USER / "chat_history.db"


def get_admin_user_id() -> str | None:
    if not DB_PATH.exists():
        return None
    conn = sqlite3.connect(str(DB_PATH))
    row = conn.execute(
        "SELECT id FROM users WHERE role = 'administrator' LIMIT 1"
    ).fetchone()
    conn.close()
    return row[0] if row else None


def migrate_memory(user_id: str) -> None:
    src = DATA_MEMORY
    dst = DATA_USERS / user_id / "memory"
    if not src.exists() or dst.exists():
        return
    print(f"  memory: {src} → {dst}")
    shutil.copytree(src, dst, dirs_exist_ok=True)


def migrate_workspace(user_id: str) -> None:
    src = DATA_USER / "workspace"
    dst = DATA_USERS / user_id / "workspace"
    if not src.exists() or dst.exists():
        return
    print(f"  workspace: {src} → {dst}")
    shutil.copytree(src, dst, dirs_exist_ok=True)


def migrate_settings(user_id: str) -> None:
    settings_dir = DATA_USER / "settings"
    old_iface = settings_dir / "interface.json"
    if not old_iface.exists():
        return
    new_iface = settings_dir / f"interface_{user_id}.json"
    if new_iface.exists():
        return
    print(f"  settings: {old_iface} → {new_iface}")
    shutil.copy2(old_iface, new_iface)


def update_session_user_ids(user_id: str) -> None:
    if not DB_PATH.exists():
        return
    conn = sqlite3.connect(str(DB_PATH))
    try:
        conn.execute("PRAGMA foreign_keys = OFF")
        # Update all sessions to belong to the admin user
        result = conn.execute(
            "UPDATE sessions SET user_id = ? WHERE user_id = '' OR user_id IS NULL",
            (user_id,),
        )
        print(f"  sessions: updated {result.rowcount} rows with user_id={user_id}")
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    user_id = get_admin_user_id()
    if not user_id:
        print("No admin user found in database. Nothing to migrate.")
        return

    DATA_USERS.mkdir(parents=True, exist_ok=True)
    print(f"Admin user_id: {user_id}")

    migrate_memory(user_id)
    migrate_workspace(user_id)
    migrate_settings(user_id)
    update_session_user_ids(user_id)

    print("\nMigration complete. Existing data is now under:")
    print(f"  {DATA_USERS / user_id}")
    print("\nYou can safely delete the old data/ directories if everything works.")


if __name__ == "__main__":
    main()
