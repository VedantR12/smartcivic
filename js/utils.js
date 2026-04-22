import { supabase } from "./supabaseClient.js"

export const API = "http://127.0.0.1:8000"

export async function getToken() {
  // refreshSession() always gets a fresh token using the refresh_token
  // Falls back to getSession() if no refresh token exists
  const { data, error } = await supabase.auth.refreshSession()

  if (!error && data.session) {
    localStorage.setItem("sc_token", data.session.access_token)
    localStorage.setItem("sc_refresh", data.session.refresh_token)
    return data.session.access_token
  }

  // Fallback: try existing session
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session) {
    localStorage.setItem("sc_token", sessionData.session.access_token)
    return sessionData.session.access_token
  }

  return null
}

export async function apiFetch(path, options = {}) {
  const token = await getToken()
  if (!token) {
    window.location.href = "/login.html"
    return null
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Authorization": `Bearer ${token}`
    }
  })

  if (res.status === 401) {
    // Token truly invalid — clear and redirect
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = "/login.html"
    return null
  }

  return res
}

export function getAdminToken() {
  return localStorage.getItem("sc_admin_token")
}

export async function adminFetch(path, options = {}) {
  const token = getAdminToken()
  if (!token) {
    window.location.href = "/"
    return null
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Authorization": `Bearer ${token}`
    }
  })

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("sc_admin_token")
    localStorage.removeItem("sc_admin_name")
    window.location.href = "/"
    return null
  }

  return res
}