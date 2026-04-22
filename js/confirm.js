async function handleConfirmation() {
  const params = new URLSearchParams(window.location.search)
  const compId = params.get("comp")
  const action = params.get("action")

  const iconEl = document.getElementById("statusIcon")
  const titleEl = document.getElementById("statusTitle")
  const msgEl = document.getElementById("statusMessage")

  if (!compId || !action) {
    iconEl.innerText = "❌"
    titleEl.innerText = "Invalid Request"
    msgEl.innerText = "This confirmation link is invalid or missing parameters."
    return
  }

  try {
    const res = await fetch(
      `http://127.0.0.1:8000/confirm/${compId}?action=${action}`,
      { method: "PUT" }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      iconEl.innerText = "❌"
      titleEl.innerText = "Error"
      msgEl.innerText = err.detail || "Something went wrong. Please try again."
      return
    }

    if (action === "yes") {
      iconEl.innerText = "✅"
      titleEl.innerText = "Thank You!"
      msgEl.innerHTML = `
        Complaint <strong style="color:var(--amber)">#${compId.slice(0, 8)}</strong> is now marked as <strong>Resolved</strong>.<br><br>
        We're glad the issue was fixed! You can close this tab.
      `
    } else {
      iconEl.innerText = "⚠️"
      titleEl.innerText = "Noted!"
      msgEl.innerHTML = `
        Complaint <strong style="color:var(--amber)">#${compId.slice(0, 8)}</strong> has been reverted to <strong>Pending</strong>.<br><br>
        The municipality will re-investigate the issue.
      `
    }

  } catch (err) {
    console.error(err)
    iconEl.innerText = "❌"
    titleEl.innerText = "Server Error"
    msgEl.innerText = "Could not connect to server. Please try again later."
  }
}

handleConfirmation()