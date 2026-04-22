import { apiFetch, getToken } from "./utils.js"
import { supabase } from "./supabaseClient.js"

let lat = null
let lng = null
let marker = null

// ─── AUTH CHECK ───────────────────────────────────────────────
const { data: sessionData } = await supabase.auth.getSession()
if (!sessionData?.session) {
  window.location.href = "/login.html"
  throw new Error("Not authenticated")
}
localStorage.setItem("sc_token", sessionData.session.access_token)

// ─── MAP INIT ─────────────────────────────────────────────────
const map = L.map("map")

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map)

navigator.geolocation.getCurrentPosition(
  (pos) => {
    const { latitude, longitude } = pos.coords
    lat = latitude
    lng = longitude
    map.setView([lat, lng], 16)
    L.marker([lat, lng]).addTo(map).bindPopup("Your current location").openPopup()
  },
  () => {
    // Fallback: Chhatrapati Sambhajinagar
    map.setView([19.8762, 75.3433], 13)
  },
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
)

map.on("click", (e) => {
  lat = parseFloat(e.latlng.lat.toFixed(6))
  lng = parseFloat(e.latlng.lng.toFixed(6))
  document.getElementById("selectedLocation").innerText =
    `📍 Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
  if (marker) map.removeLayer(marker)
  marker = L.marker([lat, lng]).addTo(map)
})

// ─── SUBMIT ───────────────────────────────────────────────────
const submitBtn = document.getElementById("submitComplaint")

if (submitBtn) {
  submitBtn.addEventListener("click", async () => {
    const category = document.getElementById("category").value
    const description = document.getElementById("description").value.trim()
    const photoFile = document.getElementById("photo").files[0]

    if (!description) {
      alert("Please describe the issue")
      return
    }

    if (lat === null || lng === null) {
      alert("Please select a location on the map")
      return
    }

    submitBtn.disabled = true
    submitBtn.textContent = "Submitting..."

    // Use FormData to support photo upload
    const formData = new FormData()
    formData.append("category", category)
    formData.append("description", description)
    formData.append("lat", lat)
    formData.append("lng", lng)
    if (photoFile) formData.append("photo", photoFile)

    const token = await getToken()
    const res = await fetch("http://127.0.0.1:8000/complaint", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("Server error:", err)
      alert("Failed to submit complaint. Try again.")
      submitBtn.disabled = false
      submitBtn.textContent = "Submit Complaint"
      return
    }

    alert("Complaint submitted successfully!")
    window.location.href = "/dashboard.html"
  })
}