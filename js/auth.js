import { supabase } from "./supabaseClient.js"

const API = "http://127.0.0.1:8000"

// ─── GOOGLE OAUTH ─────────────────────────────────────────────
// Handle redirect callback from Google (runs on any auth page)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session) {
    localStorage.setItem("sc_token", session.access_token)
    localStorage.setItem("sc_refresh", session.refresh_token)

    const user = session.user

    // Create user profile if it doesn't exist (Google users won't have one)
    await fetch(`${API}/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        id: user.id,
        name: user.user_metadata?.full_name || user.email.split("@")[0],
        email: user.email,
        phone: user.user_metadata?.phone || ""
      })
    })

    // Redirect to dashboard
    window.location.href = "/dashboard.html"
  }
})

// Google sign-in button (both login + register pages)
const googleBtn = document.getElementById("googleBtn")
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    googleBtn.disabled = true
    googleBtn.textContent = "Redirecting..."

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login.html`
      }
    })

    if (error) {
      alert(error.message)
      googleBtn.disabled = false
      googleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 48 48">...</svg> Continue with Google`
    }
  })
}

// ─── REGISTER ─────────────────────────────────────────────────
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

    const token = data.session?.access_token
    if (token) {
      await fetch(`${API}/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone, email, id: user.id })
      })
    } else {
      // No session yet (email confirmation required) — insert directly
      await supabase.from("users").insert([{ id: user.id, name, phone, email, role: "user" }])
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

    localStorage.setItem("sc_token", data.session.access_token)
    localStorage.setItem("sc_refresh", data.session.refresh_token)

    window.location.href = "/dashboard.html"
  })
}