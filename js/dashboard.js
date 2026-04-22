import { apiFetch } from "./utils.js"
import { supabase } from "./supabaseClient.js"

// ─── AUTH CHECK ───────────────────────────────────────────────
// getSession() reads from localStorage — it's sync-ish but still needs await
const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

if (sessionError || !sessionData?.session) {
  window.location.href = "/login.html"
  // Stop execution — throw so nothing below runs while redirect happens
  throw new Error("Not authenticated")
}

// Also store/refresh token for backend calls
localStorage.setItem("sc_token", sessionData.session.access_token)

// ─── LOAD PROFILE (from backend) ─────────────────────────────
async function loadProfile() {
  const res = await apiFetch("/user/profile")
  if (!res || !res.ok) return

  const data = await res.json()

  document.getElementById("userName").innerText = data.name || "—"
  document.getElementById("userEmail").innerText = data.email || "—"
  document.getElementById("userPhone").innerText = data.phone || "—"

  const firstLetter = (data.name || "U").charAt(0).toUpperCase()
  const avatar = document.getElementById("avatar")
  avatar.innerText = firstLetter
  avatar.style.cssText = `
    width:44px; height:44px; border-radius:50%;
    background:var(--amber-dim); border:1px solid var(--amber-glow);
    display:flex; align-items:center; justify-content:center;
    font-family:var(--font-display); font-weight:700; font-size:1.1rem;
    color:var(--amber); flex-shrink:0;
  `
}

// ─── LOAD COMPLAINTS (from backend) ──────────────────────────
async function loadComplaints() {
  const res = await apiFetch("/complaints")
  if (!res || !res.ok) return

  const data = await res.json()
  const table = document.getElementById("complaintsTable")
  table.innerHTML = ""

  if (!data.length) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--slate); padding:24px;">No complaints yet.</td></tr>`
    return
  }

  data.forEach(c => {
    const statusLabel = {
      "pending": "Pending",
      "in_progress": "In Progress",
      "awaiting_confirmation": "Awaiting Your Confirmation",
      "resolved": "Resolved"
    }[c.status] || c.status

    const statusClass = {
      "resolved": "status-green",
      "awaiting_confirmation": "status-blue",
      "in_progress": "status-yellow",
      "pending": "status-orange"
    }[c.status] || "status-orange"

    const photoCell = c.photo_url
      ? `<a href="${c.photo_url}" target="_blank" style="color:var(--amber); font-size:12px;">View Photo</a>`
      : `<span style="color:var(--slate); font-size:12px;">—</span>`

    const row = document.createElement("tr")
    row.innerHTML = `
      <td style="font-size:11px; color:var(--slate);">${c.id.slice(0, 8)}…</td>
      <td>${c.category}</td>
      <td><span class="${statusClass}">${statusLabel}</span></td>
      <td>${new Date(c.created_at).toLocaleDateString("en-IN")}</td>
      <td>${photoCell}</td>
      <td>
        <button
          onclick="deleteComplaint('${c.id}', this)"
          style="background:transparent; border:1px solid rgba(239,68,68,0.3); color:#ef4444;
                 border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer;"
        >Delete</button>
      </td>
    `
    table.appendChild(row)
  })
}

// ─── DELETE COMPLAINT ─────────────────────────────────────────
window.deleteComplaint = async function(id, btn) {
  if (!confirm("Delete this complaint? This cannot be undone.")) return
  btn.disabled = true
  btn.textContent = "..."
  const res = await apiFetch(`/complaint/${id}`, { method: "DELETE" })
  if (res && res.ok) {
    loadComplaints()
  } else {
    alert("Failed to delete complaint")
    btn.disabled = false
    btn.textContent = "Delete"
  }
}

// ─── EVENTS ───────────────────────────────────────────────────
document.getElementById("lodgeComplaintBtn")
  ?.addEventListener("click", () => { window.location.href = "/complaint.html" })

document.getElementById("logoutBtn")
  ?.addEventListener("click", async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = "/"
  })

// ─── INIT ─────────────────────────────────────────────────────
loadProfile()
loadComplaints()