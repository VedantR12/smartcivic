import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import APIRouter, Depends, HTTPException, Query
from supabase_client import supabase
from deps import get_admin
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")


def send_confirmation_email(to_email: str, complaint_id: str):
    """Send confirmation email to user when admin marks complaint as awaiting confirmation."""
    yes_link = f"{FRONTEND_URL}/confirm.html?comp={complaint_id}&action=yes"
    no_link = f"{FRONTEND_URL}/confirm.html?comp={complaint_id}&action=no"

    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#0f1523;color:#e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#f59e0b;padding:20px 28px;">
        <h2 style="margin:0;color:#0f1523;font-size:18px;">SmartCivic — Issue Resolution</h2>
      </div>
      <div style="padding:28px;">
        <p style="font-size:15px;">Hi there,</p>
        <p style="font-size:14px;color:#94a3b8;">
          The municipality has marked your complaint <strong style="color:#f59e0b;">#{complaint_id[:8]}</strong> as resolved.
          Please confirm whether the issue has actually been fixed.
        </p>
        <div style="display:flex;gap:12px;margin:28px 0;">
          <a href="{yes_link}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            ✅ Yes, it's resolved
          </a>
          <a href="{no_link}" style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-left:12px;">
            ❌ No, still an issue
          </a>
        </div>
        <p style="font-size:12px;color:#475569;">
          If you click "Yes", the complaint will be marked as resolved.<br>
          If you click "No", it will revert back to pending for re-investigation.
        </p>
      </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"SmartCivic: Please confirm resolution of your complaint #{complaint_id[:8]}"
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        print(f"Confirmation email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False


@router.get("/admin/complaints")
def get_all_complaints(
    admin_id: str = Depends(get_admin),
    status: str = Query(None),
    category: str = Query(None)
):
    query = supabase.table("complaints").select("*")

    if status and status != "all":
        query = query.eq("status", status)

    if category and category != "all":
        query = query.eq("category", category)

    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.get("/admin/stats")
def get_stats(admin_id: str = Depends(get_admin)):
    """Returns total, pending, resolved counts and top category."""
    res = supabase.table("complaints").select("status, category").execute()
    complaints = res.data or []

    total = len(complaints)
    pending = sum(1 for c in complaints if c["status"] == "pending")
    resolved = sum(1 for c in complaints if c["status"] == "resolved")
    awaiting = sum(1 for c in complaints if c["status"] == "awaiting_confirmation")

    # Count categories
    cat_counts = {}
    for c in complaints:
        cat = c.get("category", "Unknown")
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    top_category = max(cat_counts, key=cat_counts.get) if cat_counts else "—"

    return {
        "total": total,
        "pending": pending,
        "resolved": resolved,
        "awaiting_confirmation": awaiting,
        "top_category": top_category,
        "category_breakdown": cat_counts
    }


@router.put("/admin/complaint/{id}/status")
def update_status(
    id: str,
    status: str = Query(...),
    admin_id: str = Depends(get_admin)
):
    valid_statuses = ["pending", "in_progress", "awaiting_confirmation", "resolved"]
    if status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")

    # Get complaint + user email
    comp = supabase.table("complaints") \
        .select("id, user_id, status") \
        .eq("id", id) \
        .single() \
        .execute()

    if not comp.data:
        raise HTTPException(404, "Complaint not found")

    # Update status
    supabase.table("complaints") \
        .update({"status": status}) \
        .eq("id", id) \
        .execute()

    email_sent = False

    # Trigger confirmation email if status changed to awaiting_confirmation
    if status == "awaiting_confirmation":
        user = supabase.table("users") \
            .select("email") \
            .eq("id", comp.data["user_id"]) \
            .single() \
            .execute()

        if user.data and user.data.get("email"):
            email_sent = send_confirmation_email(user.data["email"], id)

    return {
        "updated": True,
        "complaint_id": id,
        "new_status": status,
        "email_sent": email_sent
    }


@router.get("/admin/complaint/{id}")
def get_single_complaint(id: str, admin_id: str = Depends(get_admin)):
    comp = supabase.table("complaints") \
        .select("*") \
        .eq("id", id) \
        .single() \
        .execute()

    if not comp.data:
        raise HTTPException(404, "Complaint not found")

    user = supabase.table("users") \
        .select("email, name, phone") \
        .eq("id", comp.data["user_id"]) \
        .single() \
        .execute()

    return {
        **comp.data,
        "user_email": user.data.get("email") if user.data else None,
        "user_name": user.data.get("name") if user.data else None,
    }