/**
 * renderer.js
 * Convierte los datos de respuesta en elementos del DOM.
 */

const Renderer = (function () {

  const LOGO_SRC = "/img/atom-logo.png";

  const CAT_MAP = {
    "Flujos y Flowbuilder" : { cls: "cat--flujos",     emoji: "⚙️" },
    "Smartons"             : { cls: "cat--smartons",   emoji: "🤖" },
    "Grupos y Asignacion"  : { cls: "cat--grupos",     emoji: "👥" },
    "Plantillas y Canales" : { cls: "cat--plantillas", emoji: "📱" },
    "Usuarios y Roles"     : { cls: "cat--usuarios",   emoji: "🔑" },
    "Configuracion General": { cls: "cat--config",     emoji: "⚙️" },
    "Integraciones y API"  : { cls: "cat--api",        emoji: "🔗" },
  };

  function normalize(str) {
    return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function getCatMeta(cat) {
    const nCat = normalize(cat);
    for (const key in CAT_MAP) {
      if (nCat.includes(normalize(key).split(" ")[0])) return CAT_MAP[key];
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

  /* ── Avatar helpers ── */
  function createBotAvatar() {
    var avatar = document.createElement("div");
    avatar.className = "avatar";

    var img = document.createElement("img");
    img.src = LOGO_SRC;
    img.alt = "Atom";
    img.style.cssText = "width:100%;height:100%;border-radius:50%;object-fit:contain;";

    // Fallback si la imagen falla
    img.onerror = function () {
      avatar.innerHTML = "";
      avatar.style.cssText = "background:#E85D04;color:white;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;";
      avatar.textContent = "A";
    };

    avatar.appendChild(img);
    return avatar;
  }

  function createUserAvatar() {
    var avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "👤";
    return avatar;
  }

  /* ── Render functions ── */
  function renderRich(data) {
    const meta = getCatMeta(data.categoria || "");
    let html = '<div class="bot-card">';
    html += '<div><span class="cat-badge ' + meta.cls + '">' + meta.emoji + ' ' + esc(data.categoria || "General") + '</span></div>';

    if (data.sintomas && data.sintomas.length) {
      html += '<div class="symptoms-card"><div class="section-label">🔍 Síntomas detectados</div><div class="pills">';
      data.sintomas.forEach(function (s) { html += '<span class="pill">' + esc(s) + '</span>'; });
      html += '</div></div>';
    }

    if (data.causa) {
      html += '<div class="cause-card"><div class="cause-label">' + esc(data.emoji_causa || "💡") + ' Causa probable</div>'
            + '<div class="cause-text">' + boldify(data.causa) + '</div></div>';
    }

    if (data.pasos && data.pasos.length) {
      html += '<div class="steps-card"><div class="steps-label">🔎 Dónde buscar / Qué revisar</div>';
      data.pasos.forEach(function (p, i) {
        html += '<div class="step"><div class="step-num">' + (i + 1) + '</div><div class="step-text">' + boldify(p) + '</div></div>';
      });
      html += '</div>';
    }

    if (data.followup) {
      html += '<div class="followup">💬 ' + esc(data.followup) + '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderSimple(text) {
    var content = esc(text).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
    return '<div class="bot-bubble">' + content + '</div>';
  }

  function createTypingIndicator() {
    var wrap = document.createElement("div");
    wrap.className = "msg bot";
    wrap.id = "typing-indicator";
    var bubble = document.createElement("div");
    bubble.className = "typing-wrap";
    bubble.innerHTML = "<span></span><span></span><span></span>";
    wrap.appendChild(createBotAvatar());
    wrap.appendChild(bubble);
    return wrap;
  }

  function createMessage(role, htmlContent, suggestions) {
    var wrap = document.createElement("div");
    wrap.className = "msg " + role;
    var avatar = role === "bot" ? createBotAvatar() : createUserAvatar();
    var content = document.createElement("div");
    content.style.width = "100%";
    content.innerHTML = htmlContent;
    if (suggestions && suggestions.length) {
      var sugsEl = document.createElement("div");
      sugsEl.className = "suggestions";
      suggestions.forEach(function (text) {
        var btn = document.createElement("button");
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
