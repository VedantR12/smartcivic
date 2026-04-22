/**
 * Shared utility: get auth token and make authenticated API calls.
 * All data goes through backend — no direct Supabase queries from frontend.
 */

import { supabase } from "./supabaseClient.js"

export const API = "http://127.0.0.1:8000"

export async function getToken() {
  // Try refreshing session from Supabase Auth (source of truth)
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    localStorage.setItem("sc_token", data.session.access_token)
    return data.session.access_token
  }
  return localStorage.getItem("sc_token")
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
    window.location.href = "/"
    return null
  }

  return res
}