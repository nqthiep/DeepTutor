from deeptutor.services.auth.password import hash_password, verify_password
from deeptutor.services.auth.tokens import create_access_token, create_refresh_token, decode_token
from deeptutor.services.auth.store import AuthStore, get_auth_store
from deeptutor.services.auth.schemas import (
    UserOut,
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    ChangePasswordRequest,
)
from deeptutor.services.auth.dependencies import get_current_user, get_optional_user

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "AuthStore",
    "get_auth_store",
    "UserOut",
    "RegisterRequest",
    "LoginRequest",
    "RefreshRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "UpdateProfileRequest",
    "ChangePasswordRequest",
    "get_current_user",
    "get_optional_user",
]
