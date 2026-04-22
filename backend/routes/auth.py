import os
from fastapi import APIRouter, HTTPException
from supabase_client import supabase
from pydantic import BaseModel

router = APIRouter()


class AdminLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/auth/admin-login")
def admin_login(body: AdminLoginRequest):
    """
    Admin login via email/password.
    Admin accounts are created manually from Supabase dashboard
    and must have role='admin' in the users table.
    """
    # Authenticate via Supabase Auth
    res = supabase.auth.sign_in_with_password({
        "email": body.email,
        "password": body.password
    })

    if not res.user or not res.session:
        raise HTTPException(401, "Invalid credentials")

    user_id = res.user.id

    # Verify role is admin
    role_res = supabase.table("users") \
        .select("role, name") \
        .eq("id", user_id) \
        .single() \
        .execute()

    if not role_res.data or role_res.data.get("role") != "admin":
        raise HTTPException(403, "Not authorized as admin")

    return {
        "access_token": res.session.access_token,
        "refresh_token": res.session.refresh_token,
        "user_id": user_id,
        "name": role_res.data.get("name", "Admin"),
        "role": "admin"
    }


@router.get("/auth/me")
def get_me(authorization: str = None):
    """Simple session check endpoint"""
    return {"status": "ok"}


class UserRegisterRequest(BaseModel):
    id: str
    name: str
    email: str
    phone: str = ""


@router.post("/user/register")
def register_user_profile(body: UserRegisterRequest):
    """
    Called after Supabase auth signup to create user profile row.
    """
    # Check if already exists
    existing = supabase.table("users").select("id").eq("id", body.id).execute()
    if existing.data:
        return {"status": "already_exists"}

    res = supabase.table("users").insert({
        "id": body.id,
        "name": body.name,
        "email": body.email,
        "phone": body.phone,
        "role": "user"
    }).execute()

    if not res.data:
        raise HTTPException(500, "Failed to create user profile")

    return {"status": "created"}