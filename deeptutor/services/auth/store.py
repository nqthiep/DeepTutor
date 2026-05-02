from __future__ import annotations

import sqlite3
import time
import uuid

from deeptutor.services.session.sqlite_store import get_sqlite_session_store


class AuthStore:
    def __init__(self) -> None:
        store = get_sqlite_session_store()
        self.db_path = store.db_path
        self._initialize()

    def _initialize(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    display_name TEXT NOT NULL DEFAULT '',
                    role TEXT NOT NULL DEFAULT 'learner',
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_users_email
                    ON users(email);

                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash TEXT NOT NULL,
                    expires_at REAL NOT NULL,
                    created_at REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
                    ON refresh_tokens(user_id);

                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash TEXT NOT NULL,
                    expires_at REAL NOT NULL,
                    used INTEGER NOT NULL DEFAULT 0,
                    created_at REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_reset_tokens_user
                    ON password_reset_tokens(user_id);
                """
            )
            # Migrate: add role column to users if missing
            user_columns = {
                row[1]
                for row in conn.execute("PRAGMA table_info(users)").fetchall()
            }
            if "role" not in user_columns:
                conn.execute(
                    "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'learner'"
                )

            # Migrate: add user_id to sessions if missing
            session_columns = {
                row[1] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()
            }
            if "user_id" not in session_columns:
                conn.execute(
                    "ALTER TABLE sessions ADD COLUMN user_id TEXT DEFAULT ''"
                )

            # Migrate: add user_id to notebook_entries if missing
            ne_columns = {
                row[1] for row in conn.execute("PRAGMA table_info(notebook_entries)").fetchall()
            }
            if "user_id" not in ne_columns:
                conn.execute(
                    "ALTER TABLE notebook_entries ADD COLUMN user_id TEXT DEFAULT ''"
                )

            # Migrate: add user_id to notebook_categories if missing
            nc_columns = {
                row[1] for row in conn.execute("PRAGMA table_info(notebook_categories)").fetchall()
            }
            if "user_id" not in nc_columns:
                conn.execute(
                    "ALTER TABLE notebook_categories ADD COLUMN user_id TEXT DEFAULT ''"
                )

            # Migrate: add onboarding_completed to users if missing
            if "onboarding_completed" not in user_columns:
                conn.execute(
                    "ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0"
                )

            # Create learner_profile table
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS learner_profile (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    language TEXT NOT NULL DEFAULT '',
                    purpose TEXT NOT NULL DEFAULT '',
                    expectations TEXT NOT NULL DEFAULT '',
                    current_level TEXT NOT NULL DEFAULT '',
                    learning_style TEXT NOT NULL DEFAULT '',
                    topics_of_interest TEXT NOT NULL DEFAULT '',
                    time_commitment TEXT NOT NULL DEFAULT '',
                    background TEXT NOT NULL DEFAULT '',
                    completed_at REAL NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_learner_profile_user
                    ON learner_profile(user_id);
                """
            )
            # Migrate: add language column to learner_profile if missing
            lp_columns = {
                row[1] for row in conn.execute("PRAGMA table_info(learner_profile)").fetchall()
            }
            if "language" not in lp_columns:
                conn.execute(
                    "ALTER TABLE learner_profile ADD COLUMN language TEXT NOT NULL DEFAULT ''"
                )
            if "age" not in lp_columns:
                conn.execute(
                    "ALTER TABLE learner_profile ADD COLUMN age TEXT NOT NULL DEFAULT ''"
                )
            if "grade" not in lp_columns:
                conn.execute(
                    "ALTER TABLE learner_profile ADD COLUMN grade TEXT NOT NULL DEFAULT ''"
                )
            conn.commit()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    # ─── Users ───────────────────────────────────────────────────────────────

    def user_count(self) -> int:
        with self._connect() as conn:
            row = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()
            return row["cnt"] if row else 0

    def create_user(
        self,
        email: str,
        password_hash: str,
        display_name: str = "",
        role: str | None = None,
    ) -> dict:
        now = time.time()
        user_id = uuid.uuid4().hex
        if role is None:
            role = "administrator" if self.user_count() == 0 else "learner"
        with self._connect() as conn:
            try:
                conn.execute(
                    """
                    INSERT INTO users (id, email, password_hash, display_name, role, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (user_id, email, password_hash, display_name, role, now, now),
                )
                conn.commit()
            except sqlite3.IntegrityError:
                raise ValueError("Email already registered")
        return self._serialize_user(
            {"id": user_id, "email": email, "display_name": display_name, "role": role, "is_active": 1, "created_at": now, "updated_at": now}
        )

    def create_user_by_admin(
        self,
        email: str,
        password_hash: str,
        display_name: str = "",
        role: str = "learner",
    ) -> dict:
        return self.create_user(
            email=email,
            password_hash=password_hash,
            display_name=display_name,
            role=role,
        )

    def list_all_users(
        self,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> list[dict]:
        query = "SELECT * FROM users WHERE 1=1"
        params: list = []
        if search:
            query += " AND (email LIKE ? OR display_name LIKE ?)"
            like = f"%{search}%"
            params.extend([like, like])
        if role:
            query += " AND role = ?"
            params.append(role)
        if is_active is not None:
            query += " AND is_active = ?"
            params.append(1 if is_active else 0)
        query += " ORDER BY created_at ASC"
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [self._serialize_user(dict(row)) for row in rows]

    def update_user_role(self, user_id: str, role: str) -> dict | None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
                (role, time.time(), user_id),
            )
            conn.commit()
        return self.get_user_by_id(user_id)

    def toggle_user_active(self, user_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT is_active FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            if row is None:
                return None
            new_active = 0 if row["is_active"] else 1
            conn.execute(
                "UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?",
                (new_active, time.time(), user_id),
            )
            conn.commit()
        return self.get_user_by_id_including_inactive(user_id)

    def update_user_admin(self, user_id: str, **kwargs) -> dict | None:
        allowed = {"display_name", "email", "role"}
        fields = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not fields:
            return self.get_user_by_id_including_inactive(user_id)
        fields["updated_at"] = time.time()
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [user_id]
        with self._connect() as conn:
            try:
                conn.execute(
                    f"UPDATE users SET {set_clause} WHERE id = ?",
                    tuple(values),
                )
                conn.commit()
            except sqlite3.IntegrityError:
                raise ValueError("Email already in use")
        return self.get_user_by_id_including_inactive(user_id)

    def get_user_by_id_including_inactive(self, user_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        return self._serialize_user(dict(row))

    def get_user_by_email(self, email: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE email = ? AND is_active = 1",
                (email.strip().lower(),),
            ).fetchone()
        if row is None:
            return None
        return self._serialize_user(dict(row))

    def get_user_by_id(self, user_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE id = ? AND is_active = 1",
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        return self._serialize_user(dict(row))

    def update_user(self, user_id: str, **kwargs) -> dict | None:
        allowed = {"display_name"}
        fields = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
        if not fields:
            return self.get_user_by_id(user_id)
        fields["updated_at"] = time.time()
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [user_id]
        with self._connect() as conn:
            conn.execute(
                f"UPDATE users SET {set_clause} WHERE id = ?",  # nosec B608
                tuple(values),
            )
            conn.commit()
        return self.get_user_by_id(user_id)

    def update_password(self, user_id: str, password_hash: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
                (password_hash, time.time(), user_id),
            )
            conn.commit()
        return cur.rowcount > 0

    def get_password_hash(self, user_id: str) -> str | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT password_hash FROM users WHERE id = ?", (user_id,)
            ).fetchone()
        return row["password_hash"] if row else None

    # ─── Refresh Tokens ──────────────────────────────────────────────────────

    def store_refresh_token(self, user_id: str, token_hash: str, expires_at: float) -> str:
        token_id = uuid.uuid4().hex
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (token_id, user_id, token_hash, expires_at, time.time()),
            )
            conn.commit()
        return token_id

    def verify_refresh_token(self, token_hash: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT * FROM refresh_tokens
                WHERE token_hash = ? AND expires_at > ?
                """,
                (token_hash, time.time()),
            ).fetchone()
        if row is None:
            return None
        return dict(row)

    def delete_refresh_token(self, token_hash: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM refresh_tokens WHERE token_hash = ?",
                (token_hash,),
            )
            conn.commit()

    def deactivate_user(self, user_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT is_active FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            if row is None:
                return None
            if row["is_active"] == 0:
                return self.get_user_by_id_including_inactive(user_id)
            conn.execute(
                "UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?",
                (time.time(), user_id),
            )
            conn.commit()
        return self.get_user_by_id_including_inactive(user_id)

    def hard_delete_user(self, user_id: str) -> bool:
        with self._connect() as conn:
            conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (user_id,))
            conn.execute("DELETE FROM password_reset_tokens WHERE user_id = ?", (user_id,))
            cur = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
            conn.commit()
        return cur.rowcount > 0

    def delete_user_refresh_tokens(self, user_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM refresh_tokens WHERE user_id = ?",
                (user_id,),
            )
            conn.commit()

    # ─── Password Reset Tokens ───────────────────────────────────────────────

    def store_reset_token(self, user_id: str, token_hash: str, expires_at: float) -> str:
        token_id = uuid.uuid4().hex
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
                """,
                (token_id, user_id, token_hash, expires_at, time.time()),
            )
            conn.commit()
        return token_id

    def verify_reset_token(self, token_hash: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT * FROM password_reset_tokens
                WHERE token_hash = ? AND used = 0 AND expires_at > ?
                """,
                (token_hash, time.time()),
            ).fetchone()
        if row is None:
            return None
        return dict(row)

    def mark_reset_token_used(self, token_hash: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE password_reset_tokens SET used = 1 WHERE token_hash = ?",
                (token_hash,),
            )
            conn.commit()

    def clean_expired_tokens(self) -> None:
        now = time.time()
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM refresh_tokens WHERE expires_at < ?",
                (now,),
            )
            conn.execute(
                "DELETE FROM password_reset_tokens WHERE expires_at < ?",
                (now,),
            )
            conn.commit()

    # ─── Onboarding ─────────────────────────────────────────────────────────

    def get_onboarding_status(self, user_id: str) -> dict:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT onboarding_completed FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
        return {
            "onboarding_completed": bool(row["onboarding_completed"]) if row else False,
            "has_profile": self.get_learner_profile(user_id) is not None,
        }

    def complete_onboarding(self, user_id: str, profile_data: dict) -> dict:
        now = time.time()
        profile_id = uuid.uuid4().hex
        with self._connect() as conn:
            conn.execute(
                "UPDATE users SET onboarding_completed = 1, updated_at = ? WHERE id = ?",
                (now, user_id),
            )
            conn.execute(
                """
                INSERT INTO learner_profile (
                    id, user_id, language, age, grade, purpose, expectations, current_level,
                    learning_style, topics_of_interest, time_commitment,
                    background, completed_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profile_id,
                    user_id,
                    profile_data.get("language", ""),
                    profile_data.get("age", ""),
                    profile_data.get("grade", ""),
                    profile_data.get("purpose", ""),
                    profile_data.get("expectations", ""),
                    profile_data.get("current_level", ""),
                    profile_data.get("learning_style", ""),
                    profile_data.get("topics_of_interest", ""),
                    profile_data.get("time_commitment", ""),
                    profile_data.get("background", ""),
                    now,
                    now,
                    now,
                ),
            )
            conn.commit()
        return self.get_learner_profile(user_id) or {}

    def get_learner_profile(self, user_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM learner_profile WHERE user_id = ?",
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "language": row["language"] if "language" in row.keys() else "",
            "age": row["age"] if "age" in row.keys() else "",
            "grade": row["grade"] if "grade" in row.keys() else "",
            "purpose": row["purpose"],
            "expectations": row["expectations"],
            "current_level": row["current_level"],
            "learning_style": row["learning_style"],
            "topics_of_interest": row["topics_of_interest"],
            "time_commitment": row["time_commitment"],
            "background": row["background"],
            "completed_at": float(row["completed_at"]),
            "created_at": float(row["created_at"]),
            "updated_at": float(row["updated_at"]),
        }

    # ─── Serialization ───────────────────────────────────────────────────────

    @staticmethod
    def _serialize_user(row: dict) -> dict:
        return {
            "id": row["id"],
            "email": str(row["email"]),
            "display_name": str(row.get("display_name", "")),
            "role": str(row.get("role", "learner")),
            "is_active": bool(row.get("is_active", True)),
            "onboarding_completed": bool(row.get("onboarding_completed", False)),
            "created_at": float(row["created_at"]),
            "updated_at": float(row["updated_at"]),
        }


_instance: AuthStore | None = None


def get_auth_store() -> AuthStore:
    global _instance
    if _instance is None:
        _instance = AuthStore()
    return _instance
