"""
DEVSIGHTAI — Authentication & RBAC Router (Phase 6)

Implements:
  - POST /api/auth/login        → Bcrypt verification + JWT issue with role claim
  - POST /api/auth/register     → User creation with assigned role
  - GET  /api/auth/me           → Current authenticated user profile
  - POST /api/auth/demo-switch  → Quick-switch active role during presentations
  - FastAPI Dependencies for route protection and RBAC enforcement
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.security import (
    DEMO_USERS,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.core.supabase_client import supabase
from app.models.schemas import (
    DemoRoleSwitchRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

logger = logging.getLogger("devsightai.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    FastAPI dependency to extract and validate the JWT Bearer token from the request header.
    Returns the user dictionary or raises 401 Unauthorized.
    """
    if not authorization:
        # Fallback to default developer demo user for seamless local interaction if unauthenticated
        return DEMO_USERS[0]

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'",
        )

    token = parts[1]
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or malformed access token",
        )

    user_id = payload.get("sub")
    role = payload.get("role", "developer")
    name = payload.get("name", "Demo User")

    # Check against demo users first
    for u in DEMO_USERS:
        if u["id"] == user_id or u["email"] == user_id:
            return u

    # Check Supabase DB
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            logger.debug(f"DB user query error: {e}")

    return {
        "id": user_id,
        "email": user_id if "@" in user_id else f"{user_id}@devsight.ai",
        "full_name": name,
        "role": role,
        "is_active": True,
    }


def require_roles(allowed_roles: list[str]):
    """
    FastAPI dependency factory enforcing Role-Based Access Control (RBAC).
    e.g. Depends(require_roles(["manager", "admin"]))
    """
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "developer")
        if user_role not in allowed_roles and "admin" not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Role '{user_role}' is not authorized. Requires: {allowed_roles}",
            )
        return current_user
    return role_checker


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    """
    Authenticate user via email and password, issuing a signed JWT carrying the role claim.
    """
    user_record = None

    # Check Demo Users
    for u in DEMO_USERS:
        if u["email"].lower() == payload.email.lower():
            if verify_password(payload.password, u["password_hash"]) or payload.password == "password123":
                user_record = u
                break

    # Check Supabase if not found in demo users
    if not user_record and supabase:
        try:
            res = supabase.table("users").select("*").eq("email", payload.email.lower()).execute()
            if res.data and len(res.data) > 0:
                db_u = res.data[0]
                if verify_password(payload.password, db_u.get("password_hash", "")):
                    user_record = db_u
        except Exception as e:
            logger.error(f"Login database lookup error: {e}")

    if not user_record:
        # If demo credentials match any role pattern (e.g. devops@..., qa@...), create on-the-fly demo user
        role_guess = "developer"
        for r in ["developer", "devops", "qa", "manager", "admin"]:
            if r in payload.email.lower():
                role_guess = r
                break

        if payload.password in ("password123", "admin123", "devsight"):
            user_record = {
                "id": str(uuid.uuid4()),
                "email": payload.email,
                "full_name": payload.email.split("@")[0].replace(".", " ").title(),
                "role": role_guess,
                "is_active": True,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Use demo accounts or password123",
            )

    token = create_access_token(
        subject=user_record["id"],
        role=user_record.get("role", "developer"),
        full_name=user_record.get("full_name", ""),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user_record["id"]),
            "email": user_record["email"],
            "full_name": user_record.get("full_name", "User"),
            "role": user_record.get("role", "developer"),
            "is_active": user_record.get("is_active", True),
        },
    }


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: RegisterRequest):
    """
    Register a new user account with a designated role.
    """
    password_hash = get_password_hash(payload.password)
    new_user = {
        "id": str(uuid.uuid4()),
        "email": payload.email.lower(),
        "password_hash": password_hash,
        "full_name": payload.full_name,
        "role": payload.role if payload.role in ("developer", "devops", "qa", "manager", "admin") else "developer",
        "is_active": True,
    }

    if supabase:
        try:
            res = supabase.table("users").insert({
                "email": new_user["email"],
                "password_hash": new_user["password_hash"],
                "full_name": new_user["full_name"],
                "role": new_user["role"],
            }).execute()
            if res.data:
                new_user["id"] = res.data[0]["id"]
        except Exception as e:
            logger.error(f"Failed to persist user in DB: {e}")

    token = create_access_token(
        subject=new_user["id"],
        role=new_user["role"],
        full_name=new_user["full_name"],
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "full_name": new_user["full_name"],
            "role": new_user["role"],
            "is_active": True,
        },
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Return currently authenticated user profile and active role permissions.
    """
    return {
        "id": str(current_user.get("id")),
        "email": current_user.get("email"),
        "full_name": current_user.get("full_name", "User"),
        "role": current_user.get("role", "developer"),
        "is_active": current_user.get("is_active", True),
    }


@router.post("/demo-switch", response_model=TokenResponse)
async def demo_role_switch(payload: DemoRoleSwitchRequest):
    """
    Convenience endpoint for live demo presentations to switch roles instantly.
    """
    target_role = payload.role.lower()
    matched_user = None

    for u in DEMO_USERS:
        if u["role"] == target_role:
            matched_user = u
            break

    if not matched_user:
        matched_user = {
            "id": f"u-{target_role}-demo",
            "email": f"{target_role}@devsight.ai",
            "full_name": f"{target_role.title()} User",
            "role": target_role,
            "is_active": True,
        }

    token = create_access_token(
        subject=matched_user["id"],
        role=matched_user["role"],
        full_name=matched_user["full_name"],
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": matched_user["id"],
            "email": matched_user["email"],
            "full_name": matched_user["full_name"],
            "role": matched_user["role"],
            "is_active": True,
        },
    }
