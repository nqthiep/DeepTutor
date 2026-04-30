from __future__ import annotations

import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("deeptutor.auth.email")


def _get_smtp_config() -> dict:
    return {
        "host": os.getenv("SMTP_HOST", ""),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_email": os.getenv("SMTP_FROM_EMAIL", "noreply@deeptutor.com"),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    }


async def send_password_reset_email(
    email: str,
    token: str,
    frontend_url: str,
) -> None:
    config = _get_smtp_config()
    reset_link = f"{frontend_url.rstrip('/')}/reset-password?token={token}"

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; background: #faf9f6; margin: 0; padding: 24px;">
<div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px;">
<div style="text-align: center; margin-bottom: 24px;">
<h1 style="font-size: 20px; font-weight: 700; color: #1f1d1b; margin: 0;">DeepTutor</h1>
</div>
<h2 style="font-size: 18px; color: #1f1d1b; margin: 0 0 8px;">Reset your password</h2>
<p style="color: #6b655f; line-height: 1.6; margin: 0 0 20px;">
We received a request to reset your password. Click the button below to set a new password.
This link expires in 1 hour.
</p>
<a href="{reset_link}" style="display: inline-block; background: #b0501e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
Reset Password
</a>
<p style="color: #9b9590; font-size: 13px; margin-top: 24px;">
If you didn't request this, you can safely ignore this email.
</p>
</div>
</body>
</html>"""

    if config["host"]:
        try:
            import ssl

            import aiosmtplib

            msg = MIMEMultipart("alternative")
            msg["Subject"] = "DeepTutor — Password Reset"
            msg["From"] = config["from_email"]
            msg["To"] = email
            msg.attach(MIMEText(html, "html"))

            if config["use_tls"]:
                await aiosmtplib.send(
                    msg,
                    hostname=config["host"],
                    port=config["port"],
                    username=config["user"],
                    password=config["password"],
                    start_tls=True,
                    tls=ssl.create_default_context(),
                )
            else:
                await aiosmtplib.send(
                    msg,
                    hostname=config["host"],
                    port=config["port"],
                    username=config["user"],
                    password=config["password"],
                )
            logger.info(f"Password reset email sent to {email}")
            return
        except Exception:
            logger.exception(f"Failed to send password reset email to {email}")

    logger.info(f"Password reset link for {email}: {reset_link}")
