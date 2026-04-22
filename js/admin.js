import { adminFetch } from "./utils.js"

const API = "http://127.0.0.1:8000"

// ─── AUTH GUARD ───────────────────────────────────────────────
const adminToken = localStorage.getItem("sc_admin_token")
if (!adminToken) {
  window.location.href = "/"
  throw new Error("No admin token")
}

// Validate token is still alive before loading anything
const tokenCheck = await adminFetch("/admin/stats")
if (!tokenCheck) {
  // adminFetch already redirected to / on 401/403
  throw new Error("Token expired")
}
const _statsPreload = await tokenCheck.json()

// Show admin name
const adminName = localStorage.getItem("sc_admin_name") || "Admin"
const brandEl = document.querySelector(".sc-nav-brand")
if (brandEl) {
  const nameTag = document.createElement("span")
  nameTag.style.cssText = "font-size:12px; color:var(--slate); margin-left:8px;"
  nameTag.textContent = `👤 ${adminName}`
  brandEl.appendChild(nameTag)
}

// ─── MAP SETUP ────────────────────────────────────────────────
const map = L.map("adminMap").setView([18.5204, 73.8567], 12)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map)

const markersLayer = L.markerClusterGroup()
map.addLayer(markersLayer)

const statusColors = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  awaiting_confirmation: "#8b5cf6",
  resolved: "#10b981"
}

function getMarkerIcon(status) {
  const color = statusColors[status] || "#94a3b8"
  return L.divIcon({
    html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${color}"></div>`,
    iconSize: [12, 12],
    className: ""
  })
}

// ─── LOAD STATS ───────────────────────────────────────────────
async function loadStats(preloaded = null) {
  const data = preloaded || await adminFetch("/admin/stats").then(r => r?.json())
  if (!data) return

  document.getElementById("totalComplaints").textContent = data.total
  document.getElementById("pendingComplaints").textContent = data.pending
  document.getElementById("resolvedComplaints").textContent = data.resolved
  document.getElementById("topCategory").textContent = data.top_category || "—"

  // Update awaiting if element exists
  const awaitingEl = document.getElementById("awaitingComplaints")
  if (awaitingEl) awaitingEl.textContent = data.awaiting_confirmation
}

// ─── LOAD COMPLAINTS ─────────────────────────────────────────
async function loadComplaints() {
  const categoryFilter = document.getElementById("categoryFilter")?.value || "all"
  const statusFilter = document.getElementById("statusFilter")?.value || "all"

  let url = "/admin/complaints"
  const params = new URLSearchParams()
  if (categoryFilter !== "all") params.append("category", categoryFilter)
  if (statusFilter !== "all") params.append("status", statusFilter)
  if (params.toString()) url += "?" + params.toString()

  const res = await adminFetch(url)
  if (!res || !res.ok) return

  const data = await res.json()

  // ── Table ──
  const table = document.getElementById("adminTable")
  table.innerHTML = ""

  if (!data.length) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--slate); padding:24px;">No complaints found.</td></tr>`
  }

  data.forEach(c => {
    const statusLabel = {
      "pending": "Pending",
      "in_progress": "In Progress",
      "awaiting_confirmation": "Awaiting Confirmation",
      "resolved": "Resolved"
    }[c.status] || c.status

    const statusClass = {
      "resolved": "status-green",
      "awaiting_confirmation": "status-blue",
      "in_progress": "status-yellow",
      "pending": "status-orange"
    }[c.status] || "status-orange"

    const photoCell = c.photo_url
      ? `<a href="${c.photo_url}" target="_blank" style="color:var(--amber); font-size:12px;">📷 View</a>`
      : `<span style="color:var(--slate); font-size:12px;">—</span>`

    // Only show Resolve button if not already resolved/awaiting
    const actionCell = c.status === "resolved"
      ? `<span style="color:#10b981; font-size:12px;">✓ Resolved</span>`
      : c.status === "awaiting_confirmation"
      ? `<span style="color:#8b5cf6; font-size:12px;">⏳ Awaiting user</span>`
      : `<button
          onclick="resolveComplaint('${c.id}', this)"
          style="background:var(--amber); color:#0f1523; border:none;
                 border-radius:6px; padding:5px 14px; font-size:12px;
                 font-weight:600; cursor:pointer;"
        >Resolve</button>`

    const row = document.createElement("tr")
    row.innerHTML = `
      <td style="font-size:11px; color:var(--slate);" title="${c.id}">${c.id.slice(0, 8)}…</td>
      <td>${c.category}</td>
      <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.description}">${c.description}</td>
      <td>${photoCell}</td>
      <td><span class="${statusClass}">${statusLabel}</span></td>
      <td>${actionCell}</td>
    `
    table.appendChild(row)
  })

  // ── Map Markers ──
  markersLayer.clearLayers()

  data.forEach(c => {
    if (c.latitude && c.longitude) {
      const marker = L.marker([c.latitude, c.longitude], {
        icon: getMarkerIcon(c.status)
      })

      marker.bindPopup(`
        <div style="font-family:Arial,sans-serif; font-size:13px; min-width:180px;">
          <b style="color:#f59e0b">${c.category}</b><br>
          <span style="color:#64748b;">${c.description?.slice(0, 80)}${c.description?.length > 80 ? "…" : ""}</span><br><br>
          <b>Status:</b> ${c.status}<br>
          <b>ID:</b> ${c.id.slice(0, 8)}…
          ${c.photo_url ? `<br><a href="${c.photo_url}" target="_blank" style="color:#f59e0b;">📷 View Photo</a>` : ""}
        </div>
      `)

      markersLayer.addLayer(marker)
    }
  })
}

// ─── RESOLVE COMPLAINT ───────────────────────────────────────
window.resolveComplaint = async function(id, btn) {
  btn.disabled = true
  btn.textContent = "Sending..."

  const res = await adminFetch(`/admin/complaint/${id}/status?status=awaiting_confirmation`, {
    method: "PUT"
  })

  if (!res || !res.ok) {
    alert("Failed to update status")
    btn.disabled = false
    btn.textContent = "Resolve"
    return
  }

  const result = await res.json()

  if (result.email_sent) {
    alert("Confirmation email sent to the user! Waiting for their response.")
  } else {
    alert("Status updated to awaiting confirmation but email failed. Check SMTP config in .env")
  }

  loadStats()
  loadComplaints()
}

// ─── FILTERS ─────────────────────────────────────────────────
document.getElementById("categoryFilter")
  ?.addEventListener("change", loadComplaints)

document.getElementById("statusFilter")
  ?.addEventListener("change", loadComplaints)

// ─── LOGOUT ──────────────────────────────────────────────────
document.getElementById("adminLogoutBtn")
  ?.addEventListener("click", () => {
    localStorage.removeItem("sc_admin_token")
    localStorage.removeItem("sc_admin_name")
    window.location.href = "/"
  })

// ─── INIT ─────────────────────────────────────────────────────
loadStats(_statsPreload)
loadComplaints()