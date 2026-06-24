from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import get_settings
from app.core.errors import service_unavailable


def send_email(to_email: str, subject: str, text_content: str, html_content: str | None = None) -> None:
    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_from_email:
        raise service_unavailable("邮件服务未配置，暂时无法发送验证码。")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = (
        f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        if settings.smtp_from_name
        else settings.smtp_from_email
    )
    message["To"] = to_email
    message.set_content(text_content)
    if html_content:
        message.add_alternative(html_content, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception as exc:  # noqa: BLE001
        raise service_unavailable("验证码发送失败，请稍后再试。") from exc
