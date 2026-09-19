/* UI Components — أدوات بناء الواجهة (بدون مكتبات) */
(function (root) {
  const KF = (root.KF = root.KF || {});
  KF.UI = KF.UI || {};
  const doc = root.document;

  /* ---------- أيقونات SVG (currentColor) ---------- */
  const P = {
    exit: '<path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    gear: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    back: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    check: '<path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>',
    skip: '<path d="M5 5l9 7-9 7V5zM17 5v14" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
    play: '<path d="M7 4l13 8-13 8V4z" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>',
    coin: '<circle cx="12" cy="12" r="9" fill="#ffd23f" stroke="#1a0f3a" stroke-width="2.2"/><path d="M12 7v10M9.5 9.5h4a1.7 1.7 0 0 1 0 3.4h-3a1.7 1.7 0 0 0 0 3.4H15" fill="none" stroke="#1a0f3a" stroke-width="2" stroke-linecap="round"/>',
    flag: '<path d="M5 21V4M5 5h12l-2.5 4L17 13H5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    refresh: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    home: '<path d="M4 11l8-7 8 7v9H4v-9zM10 20v-6h4v6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>',
    sos: '<path d="M12 3l9 16H3L12 3zM12 10v4M12 16.5v.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  function icon(name, cls = "") {
    const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    if (cls) s.setAttribute("class", cls);
    s.innerHTML = P[name] || "";
    return s;
  }

  /* ---------- h(): بنّاء DOM صغير (textContent دايمًا = آمن من HTML injection) ---------- */
  function h(tag, attrs, ...kids) {
    const el = doc.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k === "dataset") Object.assign(el.dataset, v);
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === "text") el.textContent = v;
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    kids.flat(Infinity).forEach((c) => { if (c == null || c === false) return; el.append(c.nodeType ? c : doc.createTextNode(String(c))); });
    return el;
  }

  /* ---------- Avatar (ستيكر) ---------- */
  const ROT = [-5, 4, -3, 6, -6, 3, -4, 5];
  function avatarData(id) { return KF.DATA.avatars.find((a) => a.id === id) || KF.DATA.avatars[0]; }
  function avatar(id, size = "", extra = {}) {
    const a = avatarData(id);
    const idx = Math.max(0, KF.DATA.avatars.indexOf(a));
    const el = h("div", { class: "avatar " + size, style: { "--av-bg": a.bg, "--rot": (extra.rot != null ? extra.rot : ROT[idx % ROT.length]) + "deg" }, role: "img", "aria-label": a.label || "avatar" });
    if (a.image) {
      const img = h("img", { src: a.image, alt: "", draggable: "false" });
      img.addEventListener("error", () => { el.textContent = ""; el.append(h("span", { class: "emo" }, a.emoji || "🙂")); });
      el.append(img);
    } else el.append(h("span", { class: "emo" }, a.emoji || "🙂"));
    return el;
  }

  /* ---------- Buttons ---------- */
  function button(label, { cls = "", onClick, icon: ic, sfx, disabled, attrs } = {}) {
    const b = h("button", Object.assign({ type: "button", class: "btn " + cls, "data-sfx": sfx }, attrs || {}));
    if (ic) b.append(icon(ic, "ico"));
    if (label != null) b.append(h("span", null, label));
    if (disabled) b.disabled = true;
    if (onClick) b.addEventListener("click", (e) => { if (!b.disabled) onClick(e, b); });
    return b;
  }
  function iconButton(name, label, { onClick, cls = "" } = {}) {
    const b = h("button", { type: "button", class: "icon-btn " + cls, "aria-label": label, title: label });
    b.append(icon(name));
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }

  /* تفويض مركزي لتفاعل الأزرار: ضغطة + صوت + اهتزاز (بدون listeners كتير) */
  let delegated = false;
  function installPressFeedback() {
    if (delegated) return; delegated = true;
    const sel = ".btn, .icon-btn, .count-btn, .rps-card, .esc-card, .av-cell, .mic-btn";
    doc.addEventListener("pointerdown", (e) => {
      const t = e.target.closest && e.target.closest(sel);
      if (!t || t.disabled || t.classList.contains("is-disabled")) return;
      t.classList.add("is-pressed");
      const s = t.getAttribute("data-sfx");
      if (s !== "none") { KF.Audio.play(s || "press"); KF.Haptics.buzz("press"); }
      const off = () => { t.classList.remove("is-pressed"); };
      t.addEventListener("pointerup", off, { once: true });
      t.addEventListener("pointerleave", off, { once: true });
      t.addEventListener("pointercancel", off, { once: true });
      root.setTimeout(off, 900);
    }, { passive: true });
    // أول لمسة تفتح الصوت
    const unlock = () => { KF.Audio.unlock(); };
    doc.addEventListener("pointerdown", unlock, { once: true, passive: true });
    doc.addEventListener("keydown", unlock, { once: true });
  }

  /* ---------- Overlay: Dialog / Sheet / Toast ---------- */
  const O = { stack: [] };
  function overlayRoot() { return doc.getElementById("overlay-root"); }

  function openLayer(node, { dismissible = true, onClose, kind = "dialog" } = {}) {
    const rootEl = overlayRoot();
    const scrim = h("div", { class: "scrim" });
    const layer = { scrim, node, closed: false, onClose, dismissible, kind };
    rootEl.append(scrim, node);
    KF.Audio.play("modal");
    if (dismissible) scrim.addEventListener("click", () => close(layer));
    O.stack.push(layer);
    return layer;
  }
  function close(layer, result) {
    if (!layer || layer.closed) return;
    layer.closed = true;
    O.stack = O.stack.filter((l) => l !== layer);
    layer.node.classList.add("leaving");
    layer.scrim.style.transition = "opacity 220ms"; layer.scrim.style.opacity = "0";
    root.setTimeout(() => { layer.node.remove(); layer.scrim.remove(); }, 230);
    if (layer.onClose) layer.onClose(result);
  }
  function closeTop() { const l = O.stack[O.stack.length - 1]; if (l && l.dismissible) { close(l); return true; } return !!l; }
  function hasLayer() { return O.stack.length > 0; }
  function closeAll() { O.stack.slice().forEach((l) => close(l)); }

  /* confirm-style dialog: buttons = [{label, cls, value}] → Promise(value) */
  function dialog({ emoji, title, text, buttons, dismissible = true }) {
    return new Promise((resolve) => {
      let layer;
      const btns = (buttons || [{ label: "تمام", cls: "", value: true }]).map((b) =>
        button(b.label, { cls: (b.cls || "") + " btn-block", onClick: () => { close(layer, b.value); }, sfx: b.sfx }));
      const node = h("div", { class: "dialog", role: "dialog", "aria-modal": "true" },
        emoji ? h("div", { class: "emoji-big" }, emoji) : null,
        title ? h("h2", { class: "display h2", style: { marginBottom: "6px", color: "var(--ink)" } }, title) : null,
        text ? h("p", { style: { fontWeight: 700, marginBottom: "14px" } }, text) : null,
        h("div", { class: "stack" }, btns));
      layer = openLayer(node, { dismissible, onClose: (v) => resolve(v === undefined ? (buttons && buttons.dismissValue) ?? false : v) });
    });
  }

  function sheet({ title, content, dismissible = true, onClose, footer }) {
    let layer;
    const head = h("div", { class: "row", style: { justifyContent: "space-between", marginBottom: "8px" } },
      h("h2", { class: "display h2", style: { color: "var(--ink)" } }, title || ""),
      dismissible ? iconButton("x", "إغلاق", { onClick: () => close(layer) }) : null);
    const body = h("div", { class: "scroll" }, content);
    const node = h("div", { class: "sheet", role: "dialog", "aria-modal": "true" }, h("div", { class: "grabber" }), head, body, footer || null);
    layer = openLayer(node, { dismissible, onClose, kind: "sheet" });
    layer.body = body;
    return layer;
  }

  function toast(msg, ms = 3000) {
    const rootEl = doc.getElementById("toast-root"); if (!rootEl) return;
    const t = h("div", { class: "toast", role: "status" }, msg);
    rootEl.append(t);
    root.setTimeout(() => t.remove(), ms + 400);
  }

  const wait = (ms) => new Promise((r) => root.setTimeout(r, ms));

  Object.assign(KF.UI, { icon, h, avatar, avatarData, button, iconButton, installPressFeedback, dialog, sheet, toast, close, closeTop, hasLayer, closeAll, wait, openLayer });
})(typeof window !== "undefined" ? window : globalThis);
