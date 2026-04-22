import { supabase } from "./supabaseClient.js"

const API = "http://127.0.0.1:8000"

// ─── REGISTER ────────────────────────────────────────────────
const registerBtn = document.getElementById("registerBtn")

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const name = document.getElementById("name").value.trim()
    const phone = document.getElementById("phone").value.trim()
    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value

    if (!name || !email || !password) {
      alert("Please fill in all required fields")
      return
    }

    registerBtn.disabled = true
    registerBtn.textContent = "Creating account..."

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      alert(error.message)
      registerBtn.disabled = false
      registerBtn.textContent = "Create Account"
      return
    }

    const user = data.user || data.session?.user

    if (!user) {
      alert("Account created! Check your email to confirm, then login.")
      window.location.href = "/login.html"
      return
    }

    // Insert profile into users table via backend
    const token = data.session?.access_token
    const res = await fetch(`${API}/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ name, phone, email, id: user.id })
    })

    if (!res.ok) {
      // Fallback: insert directly (first time, session might not exist yet)
      await supabase.from("users").insert([{ id: user.id, name, phone, email }])
    }

    alert("Registration successful! Please login.")
    window.location.href = "/login.html"
  })
}

// ─── LOGIN ────────────────────────────────────────────────────
const loginBtn = document.getElementById("loginBtn")

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value

    if (!email || !password) {
      alert("Please enter email and password")
      return
    }

    loginBtn.disabled = true
    loginBtn.textContent = "Signing in..."

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert(error.message)
      loginBtn.disabled = false
      loginBtn.textContent = "Sign In"
      return
    }

    // Store token for backend calls
    localStorage.setItem("sc_token", data.session.access_token)
    localStorage.setItem("sc_refresh", data.session.refresh_token)

    window.location.href = "/dashboard.html"
  })
}