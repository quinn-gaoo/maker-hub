from __future__ import annotations

import argparse
from getpass import getpass
from pathlib import Path
import sys

from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.auth import hash_password
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.user import User


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or update a MakerHub admin account.")
    parser.add_argument("--email", required=True, help="Admin account email")
    parser.add_argument("--name", default=None, help="Display name")
    parser.add_argument("--password", default=None, help="Admin password")
    parser.add_argument("--username", default=None, help="Optional username")
    parser.add_argument("--force-role", action="store_true", help="Force role=admin even if ADMIN_EMAILS is not configured")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    email = args.email.strip().lower()
    password = args.password or getpass("Admin password: ")
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")

    settings = get_settings()
    with SessionLocal() as db:
        user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if user is None:
            user = User(
                id=f"admin-{email}",
                email=email,
                name=args.name or email.split("@", 1)[0],
                username=args.username,
                password_hash=hash_password(password),
                status="active",
                role="admin" if args.force_role or settings.is_admin_email(email) else "user",
            )
            db.add(user)
        else:
            user.name = args.name or user.name or email.split("@", 1)[0]
            user.username = args.username or user.username
            user.password_hash = hash_password(password)
            user.status = "active"
            if args.force_role or settings.is_admin_email(email):
                user.role = "admin"
            db.add(user)

        db.commit()

    print(f"Admin account ready: {email}")


if __name__ == "__main__":
    main()
