from __future__ import annotations

import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt


def _get_secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        secret = "deeptutor-default-insecure-secret-change-in-production"
    return secret


def _get_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256")


def create_access_token(
    user_id: str,
    role: str = "learner",
    expires_delta: timedelta | None = None,
) -> str:
    secret = _get_secret()
    algorithm = _get_algorithm()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")))
    )
    to_encode = {
        "sub": user_id,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(to_encode, secret, algorithm=algorithm)


def create_refresh_token() -> str:
    return uuid.uuid4().hex


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def decode_token(token: str) -> dict | None:
    secret = _get_secret()
    algorithm = _get_algorithm()
    try:
        return jwt.decode(token, secret, algorithms=[algorithm])
    except JWTError:
        return None
