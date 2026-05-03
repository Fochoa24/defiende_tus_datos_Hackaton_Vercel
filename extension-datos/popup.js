// Defensor de Datos — popup logic
// Talks to localhost:3000 (Next.js dev server with /api/chat-legal and /api/validate-claim)

const API_BASE = "http://localhost:3000"
const STORAGE_KEY = "defensor_state_v1"

const PHASE_CONFIG = {
  intake:     { label: "Problema",   step: 1, color: "#6366f1" },
  canal:      { label: "Canal",      step: 2, color: "#0ea5e9" },
  entrevista: { label: "Entrevista", step: 3, color: "#f59e0b" },
  revisando:  { label: "Revisando",  step: 4, color: "#8b5cf6" },
  entrega:    { label: "Reclamo ✓",  step: 4, color: "#10b981" },
  error:      { label: "Error",      step: 0, color: "#ef4444" },
}

const TOTAL_STEPS = 4
const CLAIM_SENTINEL = "__CLAIM_RESULT__"

const initialState = () => ({
  messages: [],
  fase: "intake",
  reviewMode: false,
  claim: null,
  pending: false,
  error: null,
})

let state = initialState()

// ---------- Persistence ----------

function loadState() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage) {
      resolve(initialState())
      return
    }
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const saved = result[STORAGE_KEY]
      if (saved) {
        try {
          resolve({ ...initialState(), ...JSON.parse(saved), pending: false })
          return
        } catch {}
      }
      resolve(initialState())
    })
  })
}

function saveState() {
  if (typeof chrome === "undefined" || !chrome.storage) return
  const toSave = { ...state, pending: false, error: null }
  chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(toSave) })
}

// ---------- DOM helpers ----------

const el = {
  chat: document.getElementById("chat"),
  badge: document.getElementById("badge"),
  badgeLabel: document.getElementById("badge-label"),
  progress: document.getElementById("progress"),
  input: document.getElementById("input"),
  sendBtn: document.getElementById("send-btn"),
  copyBtn: document.getElementById("copy-btn"),
  resetBtn: document.getElementById("reset-btn"),
}

function setRootAccent(color) {
  document.documentElement.style.setProperty("--accent", color)
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// ---------- Render ----------

function renderProgress() {
  const cfg = PHASE_CONFIG[state.fase] || PHASE_CONFIG.intake
  el.progress.innerHTML = ""
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const step = document.createElement("div")
    step.className = "step" + (i <= cfg.step ? " active" : "")
    el.progress.appendChild(step)
  }
}

function renderBadge() {
  const cfg = PHASE_CONFIG[state.fase] || PHASE_CONFIG.intake
  el.badge.className = "badge " + state.fase
  el.badgeLabel.textContent = cfg.label
  setRootAccent(cfg.color)
}

function renderMessages() {
  el.chat.innerHTML = ""

  if (state.messages.length === 0) {
    const welcome = document.createElement("div")
    welcome.className = "msg agent"
    welcome.innerHTML = `
      <div class="avatar">⚖️</div>
      <div class="bubble">¡Hola! Soy tu asistente legal de protección de datos personales.\n\nCuéntame con tus propias palabras qué problema tuviste con tus datos personales en Chile, y te ayudo a entender qué hacer y a redactar el reclamo formal.</div>
    `
    el.chat.appendChild(welcome)
    return
  }

  for (const msg of state.messages) {
    if (msg.role === "user") {
      const div = document.createElement("div")
      div.className = "msg user"
      div.textContent = msg.content
      el.chat.appendChild(div)
    } else {
      // assistant
      if (msg.content === CLAIM_SENTINEL && state.claim) {
        renderClaimResult(state.claim)
      } else {
        const wrap = document.createElement("div")
        wrap.className = "msg agent"
        wrap.innerHTML = `<div class="avatar">⚖️</div><div class="bubble">${escapeHtml(msg.content)}</div>`
        el.chat.appendChild(wrap)
      }
    }
  }

  if (state.pending) {
    const phaseColor = (PHASE_CONFIG[state.fase] || PHASE_CONFIG.intake).color
    const wrap = document.createElement("div")
    wrap.className = "msg agent"
    wrap.innerHTML = `
      <div class="avatar">⚖️</div>
      <div class="bubble">
        <div class="typing">
          <span class="dot" style="background:${phaseColor}"></span>
          <span class="dot" style="background:${phaseColor}"></span>
          <span class="dot" style="background:${phaseColor}"></span>
        </div>
      </div>`
    el.chat.appendChild(wrap)
  }

  if (state.error) {
    const div = document.createElement("div")
    div.className = "msg agent"
    div.innerHTML = `<div class="avatar">!</div><div class="bubble" style="border-color:#fecaca;background:#fef2f2;color:#991b1b">⚠️ ${escapeHtml(state.error)}</div>`
    el.chat.appendChild(div)
  }

  // auto-scroll
  el.chat.scrollTop = el.chat.scrollHeight
}

function renderClaimResult(claim) {
  const cfg = PHASE_CONFIG.entrega
  const wrap = document.createElement("div")
  wrap.className = "msg agent"
  wrap.innerHTML = `<div class="avatar">⚖️</div><div class="bubble">
    <div>Listo. Revisé tu caso contra la Ley 21.719 y aquí tienes los hallazgos:</div>
    <div class="summary-card" style="--accent:${cfg.color}">
      <div class="label">Hallazgos legales</div>
      <div class="row"><span class="k">Artículos:</span><span class="v">${escapeHtml(claim.articulos_vulnerados.join(", "))}</span></div>
      <div class="row"><span class="k">Infracción:</span><span class="v">${escapeHtml(claim.tipo_infraccion)}</span></div>
      <div class="row"><span class="k">Sanción máx.:</span><span class="v">${escapeHtml(claim.sancion_maxima)}</span></div>
      <div class="row"><span class="k">Canal:</span><span class="v">${escapeHtml(claim.canal_recomendado.replace("_", " "))}</span></div>
    </div>
    ${claim.borrador_reclamo ? `<div class="claim-box">${escapeHtml(claim.borrador_reclamo)}</div>` : ""}
  </div>`
  el.chat.appendChild(wrap)
}

function renderControls() {
  const isEntrega = state.fase === "entrega" && state.claim?.borrador_reclamo
  el.copyBtn.style.display = isEntrega ? "block" : "none"
  el.input.disabled = state.pending
  el.sendBtn.disabled = state.pending || el.input.value.trim() === ""
}

function render() {
  renderBadge()
  renderProgress()
  renderMessages()
  renderControls()
}

// ---------- API calls ----------

async function streamFromAPI(messages, fase) {
  const res = await fetch(`${API_BASE}/api/chat-legal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fase }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Chat API ${res.status}: ${text.slice(0, 200)}`)
  }

  // Stream into a new assistant message; render incrementally
  state.messages.push({ role: "assistant", content: "" })
  state.pending = false
  render()

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    state.messages[state.messages.length - 1].content += chunk
    renderMessages()
    renderControls()
  }
}

async function callValidateClaim(messages) {
  const res = await fetch(`${API_BASE}/api/validate-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Validate API ${res.status}: ${text.slice(0, 200)}`)
  }
  return await res.json()
}

// ---------- State machine ----------

function determinePhase(userCount) {
  if (userCount <= 1) return "intake"
  if (userCount === 2) return "canal"
  return "entrevista"
}

async function sendMessage(text) {
  if (state.pending) return
  state.error = null
  state.messages.push({ role: "user", content: text })
  state.pending = true
  saveState()
  render()

  try {
    if (state.reviewMode) {
      // Loop mode: every new user msg goes to validate-claim until suficiente=true
      state.fase = "revisando"
      render()
      await runReview()
    } else {
      const userCount = state.messages.filter((m) => m.role === "user").length
      if (userCount >= 7) {
        // Triggers first review
        state.reviewMode = true
        state.fase = "revisando"
        render()
        await runReview()
      } else {
        state.fase = determinePhase(userCount)
        render()
        await streamFromAPI(state.messages, state.fase)
      }
    }
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err)
    state.fase = state.fase === "revisando" ? "entrevista" : state.fase
  } finally {
    state.pending = false
    saveState()
    render()
  }
}

async function runReview() {
  const claim = await callValidateClaim(state.messages)
  if (claim.suficiente) {
    state.claim = claim
    state.fase = "entrega"
    state.messages.push({ role: "assistant", content: CLAIM_SENTINEL })
  } else {
    const question = claim.pregunta_faltante || "Necesito un detalle adicional para completar el reclamo. ¿Puedes contarme un poco más?"
    state.messages.push({ role: "assistant", content: question })
    state.fase = "entrevista"
  }
}

// ---------- Wiring ----------

function autoGrow() {
  el.input.style.height = "40px"
  const next = Math.min(el.input.scrollHeight, 100)
  el.input.style.height = `${next}px`
}

function copyClaim() {
  if (!state.claim?.borrador_reclamo) return
  navigator.clipboard.writeText(state.claim.borrador_reclamo).then(() => {
    el.copyBtn.classList.add("copied")
    el.copyBtn.textContent = "✓ Copiado"
    setTimeout(() => {
      el.copyBtn.classList.remove("copied")
      el.copyBtn.textContent = "📋 Copiar Reclamo"
    }, 1500)
  })
}

function resetAll() {
  if (!confirm("¿Empezar de nuevo? Se perderá la conversación actual.")) return
  state = initialState()
  saveState()
  el.input.value = ""
  autoGrow()
  render()
}

el.sendBtn.addEventListener("click", () => {
  const text = el.input.value.trim()
  if (!text) return
  el.input.value = ""
  autoGrow()
  sendMessage(text)
})

el.input.addEventListener("input", () => {
  autoGrow()
  renderControls()
})

el.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    el.sendBtn.click()
  }
})

el.copyBtn.addEventListener("click", copyClaim)
el.resetBtn.addEventListener("click", resetAll)

// ---------- Boot ----------

;(async () => {
  state = await loadState()
  autoGrow()
  render()
  el.input.focus()
})()
