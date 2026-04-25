/**
 * renderer.js
 * Convierte los datos de respuesta de Gemini en elementos del DOM.
 * No hace llamadas a la API — solo renderiza.
 */

const Renderer = (function () {

  /* ── Category → CSS class & emoji map ──────────────────── */
  const CAT_MAP = {
    "Flujos y Campañas": { cls: "cat--flujos", emoji: "🏗️" },
    "Smartons": { cls: "cat--smartons", emoji: "🤖" },
    "Grupos y Asignacion": { cls: "cat--grupos", emoji: "👥" },
    "Plantillas y Canales": { cls: "cat--plantillas", emoji: "📱" },
    "Usuarios y Roles": { cls: "cat--usuarios", emoji: "🔑" },
    "Configuracion General": { cls: "cat--config", emoji: "⚙️" },
    "Integraciones y API": { cls: "cat--api", emoji: "🌐" },
  };

  function normalize(str) {
    return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function getCatMeta(cat) {
    const nCat = normalize(cat);
    for (const key in CAT_MAP) {
      const nKey = normalize(key).split(" ")[0];
      if (nCat.includes(nKey)) return CAT_MAP[key];
    }
    return { cls: "cat--config", emoji: "📋" };
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function boldify(str) {
    return esc(str).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }

  /* Elimina el número al inicio del paso para evitar duplicado con el círculo
     ej: "1. Ir a Configuraciones" → "Ir a Configuraciones"
     ej: "1) Ir a Configuraciones" → "Ir a Configuraciones"  */
  function stripLeadingNumber(str) {
    return (str || "").replace(/^\s*\d+[\.\)]\s*/, "");
  }

  /* ── Avatar helpers ── */
  function createBotAvatar() {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    const img = document.createElement("img");
    img.src = "/img/atom-logo.png";
    img.alt = "Atom";
    img.style.cssText = "width:100%;height:100%;border-radius:50%;object-fit:contain;";
    img.onerror = function () {
      avatar.innerHTML = "";
      avatar.style.cssText = "background:#E85D04;color:white;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;";
      avatar.textContent = "A";
    };
    avatar.appendChild(img);
    return avatar;
  }

  function createUserAvatar() {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerHTML = "👨🏻‍💻";
    return avatar;
  }

  /* ── Render functions ── */
  function renderRich(data) {
    const meta = getCatMeta(data.categoria || "");
    let html = '<div class="bot-card">';

    html += `<div><span class="cat-badge ${meta.cls}">${meta.emoji} ${esc(data.categoria || "General")}</span></div>`;

    if (data.sintomas && data.sintomas.length) {
      html += '<div class="symptoms-card"><div class="section-label">🔍 Síntomas detectados</div><div class="pills">';
      data.sintomas.forEach(s => { html += `<span class="pill">${esc(s)}</span>`; });
      html += "</div></div>";
    }

    if (data.causa) {
      html += `<div class="cause-card">
        <div class="cause-label">${esc(data.emoji_causa || "💡")} Causa probable</div>
        <div class="cause-text">${boldify(data.causa)}</div>
      </div>`;
    }

    if (data.pasos && data.pasos.length) {
      html += '<div class="steps-card"><div class="steps-label">🔎 Dónde buscar / Qué revisar</div>';
      data.pasos.forEach((p, i) => {
        const stepText = stripLeadingNumber(p);
        html += `<div class="step">
          <div class="step-num">${i + 1}</div>
          <div class="step-text">${boldify(stepText)}</div>
        </div>`;
      });
      html += "</div>";
    }

    if (data.followup) {
      html += `<div class="followup">💬 ${esc(data.followup)}</div>`;
    }

    html += "</div>";
    return html;
  }

  function renderSimple(text) {
    const content = esc(text)
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>");
    return `<div class="bot-bubble">${content}</div>`;
  }

  function createTypingIndicator() {
    const wrap = document.createElement("div");
    wrap.className = "msg bot";
    wrap.id = "typing-indicator";
    const bubble = document.createElement("div");
    bubble.className = "typing-wrap";
    bubble.innerHTML = "<span></span><span></span><span></span>";
    wrap.appendChild(createBotAvatar());
    wrap.appendChild(bubble);
    return wrap;
  }

  function createMessage(role, htmlContent, suggestions) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;
    const avatar = role === "bot" ? createBotAvatar() : createUserAvatar();
    const content = document.createElement("div");
    content.style.width = "100%";
    content.innerHTML = htmlContent;
    if (suggestions && suggestions.length) {
      const sugsEl = document.createElement("div");
      sugsEl.className = "suggestions";
      suggestions.forEach(text => {
        const btn = document.createElement("button");
        btn.className = "sug";
        btn.textContent = text;
        sugsEl.appendChild(btn);
      });
      content.appendChild(sugsEl);
    }
    wrap.appendChild(avatar);
    wrap.appendChild(content);
    return wrap;
  }

  return { renderRich, renderSimple, createMessage, createTypingIndicator };

})();
