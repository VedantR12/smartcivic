from fastapi import Header, HTTPException
from supabase_client import supabase


def get_user(authorization: str = Header(...)):
    """
    Validates the Supabase JWT by calling supabase.auth.get_user(token).
    No manual JWT decoding — Supabase handles it server-side.
    Returns: user_id (str)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid Authorization header")

    token = authorization.split(" ")[1]

    try:
        res = supabase.auth.get_user(token)
    except Exception as e:
        raise HTTPException(401, f"Token validation failed: {e}")

    if not res or not res.user:
        raise HTTPException(401, "Invalid or expired token")

    return res.user.id


def get_admin(authorization: str = Header(...)):
    """
    Same as get_user but also checks role == 'admin' in users table.
    """
    user_id = get_user(authorization)

    res = supabase.table("users") \
        .select("role") \
        .eq("id", user_id) \
        .single() \
        .execute()

    if not res.data or res.data.get("role") != "admin":
        raise HTTPException(403, "Access denied: not an admin")

    return user_id