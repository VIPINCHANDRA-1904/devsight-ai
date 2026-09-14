"""
DEVSIGHTAI — Core Security, Password Hashing & JWT Token Management (Phase 6)

Implements:
  - Bcrypt password hashing and verification
  - JWT token encoding and decoding with role claims
  - Demo user credentials for quick role switching and presentations
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger("devsightai.security")

# Demo users with pre-configured roles for live presentations and offline mode
DEMO_USERS = [
    {
        "id": "u-dev-001",
        "email": "developer@devsight.ai",
        "full_name": "Devin Coder",
        "role": "developer",
        "password_hash": bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode("utf-8"),
        "is_active": True,
    },
    {
        "id": "u-ops-002",
        "email": "devops@devsight.ai",
        "full_name": "Alex SysAdmin",
        "role": "devops",
        "password_hash": bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode("utf-8"),
        "is_active": True,
    },
    {
        "id": "u-qa-003",
        "email": "qa@devsight.ai",
        "full_name": "Quinn Tester",
        "role": "qa",
        "password_hash": bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode("utf-8"),
        "is_active": True,
    },
    {
        "id": "u-mgr-004",
        "email": "manager@devsight.ai",
        "full_name": "Morgan Director",
        "role": "manager",
        "password_hash": bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode("utf-8"),
        "is_active": True,
    },
    {
        "id": "u-adm-005",
        "email": "admin@devsight.ai",
        "full_name": "Root Administrator",
        "role": "admin",
        "password_hash": bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode("utf-8"),
        "is_active": True,
    },
]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(
    subject: str,
    role: str = "developer",
    full_name: str = "",
    expires_delta: Optional[timedelta] = None
) -> str:
    """Generate a signed JWT access token carrying user ID, role claim, and expiration."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "name": full_name,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """Decode and validate a signed JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.debug(f"JWT decode error: {e}")
        return None
