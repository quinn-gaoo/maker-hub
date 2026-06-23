import hashlib
import hmac
import json
import time
import asyncio

from fastapi import Request

from app.core.security import verify_internal_user


class DummyReceive:
    def __init__(self, body: bytes):
        self.body = body

    async def __call__(self):
        return {"type": "http.request", "body": self.body, "more_body": False}


def test_verify_internal_user_accepts_valid_signature(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_SIGNING_SECRET", "secret")
    body = json.dumps({"hello": "world"}).encode("utf-8")
    timestamp = str(int(time.time() * 1000))
    payload = f"user-1:user@example.com:{timestamp}:{body.decode('utf-8')}"
    signature = hmac.new(b"secret", payload.encode("utf-8"), hashlib.sha256).hexdigest()
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": [],
        },
        receive=DummyReceive(body),
    )

    user = asyncio.run(
        verify_internal_user(
            request=request,
            x_user_id="user-1",
            x_user_email="user@example.com",
            x_timestamp=timestamp,
            x_signature=signature,
        )
    )

    assert user.user_id == "user-1"
