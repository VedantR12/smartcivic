import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from supabase_client import supabase
from deps import get_user
from typing import Optional

router = APIRouter()

SUPABASE_BUCKET = "complaint-photos"


@router.post("/complaint")
async def create_complaint(
    category: str = Form(...),
    description: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    photo: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_user)
):
    photo_url = None

    # Upload photo to Supabase Storage if provided
    if photo and photo.filename:
        try:
            file_bytes = await photo.read()
            ext = photo.filename.rsplit(".", 1)[-1].lower()
            file_name = f"{uuid.uuid4()}.{ext}"
            file_path = f"complaints/{file_name}"

            supabase.storage.from_(SUPABASE_BUCKET).upload(
                file_path,
                file_bytes,
                {"content-type": photo.content_type}
            )

            photo_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(file_path)
        except Exception as e:
            print(f"Photo upload failed: {e}")
            # Don't block complaint submission if photo fails

    res = supabase.table("complaints").insert({
        "user_id": user_id,
        "title": category,
        "description": description,
        "category": category,
        "latitude": lat,
        "longitude": lng,
        "photo_url": photo_url,
        "status": "pending"
    }).execute()

    if not res.data:
        raise HTTPException(500, "Failed to create complaint")

    return res.data[0]


@router.get("/complaints")
def get_user_complaints(user_id: str = Depends(get_user)):
    res = supabase.table("complaints") \
        .select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .execute()

    return res.data or []


@router.delete("/complaint/{id}")
def delete_complaint(id: str, user_id: str = Depends(get_user)):
    # Verify ownership before deleting
    existing = supabase.table("complaints") \
        .select("id, user_id, photo_url") \
        .eq("id", id) \
        .single() \
        .execute()

    if not existing.data:
        raise HTTPException(404, "Complaint not found")

    if existing.data["user_id"] != user_id:
        raise HTTPException(403, "Not your complaint")

    # Delete photo from storage if exists
    photo_url = existing.data.get("photo_url")
    if photo_url:
        try:
            # Extract file path from URL
            path_part = photo_url.split(f"/object/public/{SUPABASE_BUCKET}/")
            if len(path_part) > 1:
                supabase.storage.from_(SUPABASE_BUCKET).remove([path_part[1]])
        except Exception as e:
            print(f"Photo delete failed (non-fatal): {e}")

    supabase.table("complaints").delete().eq("id", id).execute()
    return {"deleted": True}


@router.put("/confirm/{id}")
def confirm_complaint(id: str, action: str):
    """
    Called from the confirmation email link.
    action=yes → resolved
    action=no  → pending
    """
    if action not in ("yes", "no"):
        raise HTTPException(400, "Invalid action")

    new_status = "resolved" if action == "yes" else "pending"

    res = supabase.table("complaints") \
        .update({"status": new_status}) \
        .eq("id", id) \
        .execute()

    if not res.data:
        raise HTTPException(404, "Complaint not found")

    return {"status": new_status, "complaint_id": id}


@router.get("/user/profile")
def get_user_profile(user_id: str = Depends(get_user)):
    res = supabase.table("users") \
        .select("id, name, email, phone") \
        .eq("id", user_id) \
        .single() \
        .execute()

    if not res.data:
        raise HTTPException(404, "User not found")

    return res.data