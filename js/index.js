const API = "http://127.0.0.1:8000"

function showUser() {
  document.getElementById("roleSelect").style.display = "none"
  document.getElementById("userOptions").style.display = "block"
}

function showAdmin() {
  document.getElementById("roleSelect").style.display = "none"
  document.getElementById("adminLogin").style.display = "block"
}

function goBack() {
  document.getElementById("roleSelect").style.display = "block"
  document.getElementById("userOptions").style.display = "none"
  document.getElementById("adminLogin").style.display = "none"
}

function goLogin() {
  window.location.href = "/login.html"
}

function goRegister() {
  window.location.href = "/register.html"
}

async function adminLogin() {
  const email = document.getElementById("adminUser").value.trim()
  const password = document.getElementById("adminPass").value

  if (!email || !password) {
    alert("Please enter email and password")
    return
  }

  const btn = document.querySelector("#adminLogin .btn-primary")
  if (btn) { btn.disabled = true; btn.textContent = "Logging in..." }

  try {
    const res = await fetch(`${API}/auth/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    })

    if (!res.ok) {
      const err = await res.json()
      alert(err.detail || "Invalid admin credentials")
      if (btn) { btn.disabled = false; btn.textContent = "Login to Admin Panel" }
      return
    }

    const data = await res.json()

    // Store admin token separately from user token
    localStorage.setItem("sc_admin_token", data.access_token)
    localStorage.setItem("sc_admin_name", data.name)

    window.location.href = "/admin.html"

  } catch (err) {
    console.error(err)
    alert("Server error. Is the backend running?")
    if (btn) { btn.disabled = false; btn.textContent = "Login to Admin Panel" }
  }
}

window.showUser = showUser
window.showAdmin = showAdmin
window.goBack = goBack
window.goLogin = goLogin
window.goRegister = goRegister
window.adminLogin = adminLogin