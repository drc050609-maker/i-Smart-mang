(() => {
  if (window.__ismartWebsiteChatLoaded) return;
  window.__ismartWebsiteChatLoaded = true;

  const STORAGE_KEY = "ismart-website-chat-key";
  const scriptEl = document.currentScript;
  const API_BASE = (() => {
    try {
      if (scriptEl && scriptEl.src) return new URL(scriptEl.src).origin;
    } catch {
      /* use fallback */
    }
    return "https://admin.i-smartmusic.com";
  })();

  const css = `
    .ismart-chat-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif}
    .ismart-chat-panel{width:min(22rem,calc(100vw - 2.5rem));height:min(32rem,calc(100vh - 7rem));margin-bottom:12px;display:flex;flex-direction:column;overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 18px 40px rgba(28,20,36,.22);border:1px solid rgba(0,0,0,.08)}
    .ismart-chat-head{background:#4a1868;color:#fff;padding:12px 14px;display:flex;justify-content:space-between;gap:8px}
    .ismart-chat-head strong{display:block;font-size:16px}
    .ismart-chat-head span{display:block;font-size:12px;opacity:.8;margin-top:2px}
    .ismart-chat-head button,.ismart-chat-fab{background:none;border:0;color:inherit;cursor:pointer}
    .ismart-chat-body{flex:1;overflow:auto;padding:12px;background:#f7f2ea}
    .ismart-chat-note{font-size:13px;color:#6b6173;margin:0}
    .ismart-chat-row{display:flex;margin:8px 0}
    .ismart-chat-row.you{justify-content:flex-end}
    .ismart-chat-bubble{max-width:85%;border-radius:16px;padding:8px 10px;font-size:13px;white-space:pre-wrap;word-break:break-word}
    .ismart-chat-row.you .ismart-chat-bubble{background:#6d28a8;color:#fff}
    .ismart-chat-row.school .ismart-chat-bubble{background:#fff;color:#1c1424;box-shadow:0 1px 2px rgba(0,0,0,.06)}
    .ismart-chat-meta{font-size:11px;opacity:.7;margin-bottom:4px}
    .ismart-chat-form{padding:10px;border-top:1px solid rgba(0,0,0,.08);display:grid;gap:8px}
    .ismart-chat-form input,.ismart-chat-form textarea{width:100%;border:1px solid rgba(0,0,0,.12);border-radius:8px;padding:8px 10px;font:inherit;box-sizing:border-box}
    .ismart-chat-form textarea{min-height:56px;resize:none}
    .ismart-chat-form button[type=submit]{background:#4a1868;color:#fff;border:0;border-radius:999px;padding:8px 12px;cursor:pointer;font:inherit}
    .ismart-chat-form button[disabled]{opacity:.6;cursor:default}
    .ismart-chat-error{color:#b91c1c;font-size:12px;margin:0}
    .ismart-chat-fab{width:56px;height:56px;border-radius:999px;background:#6d28a8;color:#fff;font-size:22px;box-shadow:0 10px 24px rgba(74,24,104,.35);margin-left:auto;display:flex;align-items:center;justify-content:center}
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "ismart-chat-root";
  root.innerHTML = `
    <div class="ismart-chat-panel" hidden>
      <div class="ismart-chat-head">
        <div>
          <strong>Chat with iSmart</strong>
          <span>We usually reply during school hours.</span>
        </div>
        <button type="button" class="ismart-chat-close" aria-label="Close chat">×</button>
      </div>
      <div class="ismart-chat-body">
        <p class="ismart-chat-note">Leave your name and a way to reach you, then send a message. Staff will reply here.</p>
      </div>
      <form class="ismart-chat-form">
        <input name="name" placeholder="Name" autocomplete="name">
        <input name="email" placeholder="Email" autocomplete="email">
        <input name="phone" placeholder="Phone" autocomplete="tel">
        <textarea name="body" required placeholder="Type a message…"></textarea>
        <p class="ismart-chat-error" hidden></p>
        <button type="submit">Send</button>
      </form>
    </div>
    <button type="button" class="ismart-chat-fab" aria-label="Open chat">💬</button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector(".ismart-chat-panel");
  const bodyEl = root.querySelector(".ismart-chat-body");
  const form = root.querySelector("form");
  const errorEl = root.querySelector(".ismart-chat-error");
  const fab = root.querySelector(".ismart-chat-fab");
  const closeBtn = root.querySelector(".ismart-chat-close");
  const nameInput = form.querySelector('input[name="name"]');
  const emailInput = form.querySelector('input[name="email"]');
  const phoneInput = form.querySelector('input[name="phone"]');
  const bodyInput = form.querySelector('textarea[name="body"]');
  const submitBtn = form.querySelector('button[type="submit"]');

  let visitorKey = null;
  try {
    visitorKey = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    visitorKey = null;
  }
  let messages = [];

  function setOpen(open) {
    panel.hidden = !open;
    fab.textContent = open ? "×" : "💬";
    fab.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) void refresh();
  }

  function showError(text) {
    errorEl.hidden = !text;
    errorEl.textContent = text || "";
  }

  function render() {
    if (!messages.length) {
      bodyEl.innerHTML =
        '<p class="ismart-chat-note">Leave your name and a way to reach you, then send a message. Staff will reply here.</p>';
      nameInput.hidden = false;
      emailInput.hidden = false;
      phoneInput.hidden = false;
      return;
    }
    nameInput.hidden = true;
    emailInput.hidden = true;
    phoneInput.hidden = true;
    bodyEl.innerHTML = messages
      .map((message) => {
        const fromSchool = message.from === "staff";
        const when = new Date(message.createdAt).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        });
        return `<div class="ismart-chat-row ${fromSchool ? "school" : "you"}">
          <div class="ismart-chat-bubble">
            <div class="ismart-chat-meta">${fromSchool ? "iSmart" : "You"} · ${when}</div>
            <div></div>
          </div>
        </div>`;
      })
      .join("");
    [...bodyEl.querySelectorAll(".ismart-chat-bubble div:last-child")].forEach(
      (node, index) => {
        node.textContent = messages[index].body;
      },
    );
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  async function refresh() {
    if (!visitorKey) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/website-chat?key=${encodeURIComponent(visitorKey)}`,
      );
      if (res.status === 404) {
        visitorKey = null;
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        messages = [];
        render();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      messages = data.messages || [];
      render();
    } catch {
      /* ignore poll errors */
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = bodyInput.value.trim();
    if (!body) return;
    showError("");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    try {
      const payload = visitorKey
        ? { visitorKey, body }
        : {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            body,
          };
      const res = await fetch(`${API_BASE}/api/website-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send.");
      visitorKey = data.visitorKey;
      try {
        window.localStorage.setItem(STORAGE_KEY, visitorKey);
      } catch {
        /* ignore */
      }
      messages = data.messages || [];
      bodyInput.value = "";
      render();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send";
    }
  });

  fab.addEventListener("click", () => setOpen(panel.hidden));
  closeBtn.addEventListener("click", () => setOpen(false));
  window.setInterval(() => {
    if (!panel.hidden) void refresh();
  }, 4000);
  render();
})();
