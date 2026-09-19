/* VFX Manager — كونفيتي، اهتزاز، وميض، نقاط طايرة. خفيف على الموبايلات الضعيفة. */
(function (root) {
  const KF = (root.KF = root.KF || {});
  const doc = () => root.document;

  const V = {
    reduced: false,          // من الإعدادات "تأثيرات خفيفة" أو prefers-reduced-motion
    _canvas: null, _ctx: null, _parts: [], _raf: 0, _dpr: 1, _w: 0, _h: 0,

    isReduced() {
      let sys = false;
      try { sys = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
      return this.reduced || sys;
    },

    /* ---------- كونفيتي على Canvas واحدة ---------- */
    _ensureCanvas() {
      if (this._canvas) return;
      const c = doc().createElement("canvas");
      c.className = "vfx-canvas";
      c.setAttribute("aria-hidden", "true");
      doc().body.appendChild(c);
      this._canvas = c; this._ctx = c.getContext("2d");
      this._resize();
      root.addEventListener("resize", () => this._resize(), { passive: true });
    },
    _resize() {
      if (!this._canvas) return;
      this._dpr = Math.min(2, root.devicePixelRatio || 1);
      this._w = root.innerWidth; this._h = root.innerHeight;
      this._canvas.width = this._w * this._dpr; this._canvas.height = this._h * this._dpr;
      this._canvas.style.width = this._w + "px"; this._canvas.style.height = this._h + "px";
    },

    /* opts: {x,y} بالبكسل (الافتراضي وسط الشاشة)، count، spread، power، colors، gravity */
    confetti(opts = {}) {
      if (!doc()) return;
      this._ensureCanvas();
      const red = this.isReduced();
      const n = Math.round((opts.count || 90) * (red ? 0.3 : 1));
      const colors = opts.colors || ["#ff3d8b", "#ffd23f", "#14c9b4", "#7c4dff", "#ff7a1a", "#4fd15f", "#ffffff"];
      const x = opts.x != null ? opts.x : this._w / 2, y = opts.y != null ? opts.y : this._h * 0.45;
      const power = opts.power || 11, spread = opts.spread != null ? opts.spread : Math.PI * 2;
      const baseAngle = opts.angle != null ? opts.angle : -Math.PI / 2;
      for (let i = 0; i < n; i++) {
        const a = baseAngle + (Math.random() - 0.5) * spread;
        const sp = power * (0.45 + Math.random() * 0.75);
        this._parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          g: opts.gravity || 0.34, w: 6 + Math.random() * 7, h: 4 + Math.random() * 6,
          rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
          c: colors[(Math.random() * colors.length) | 0], life: 1, decay: 0.006 + Math.random() * 0.007,
          shape: Math.random() < 0.25 ? 1 : 0,
        });
      }
      if (this._parts.length > 400) this._parts.splice(0, this._parts.length - 400);
      if (!this._raf) this._raf = root.requestAnimationFrame(() => this._loop());
    },
    _loop() {
      const ctx = this._ctx; if (!ctx) return;
      ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
      ctx.clearRect(0, 0, this._w, this._h);
      const parts = this._parts;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += p.g; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.decay;
        if (p.life <= 0 || p.y > this._h + 30) { parts.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.6);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.shape) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.2, 0, 6.28); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (parts.length) this._raf = root.requestAnimationFrame(() => this._loop());
      else { this._raf = 0; ctx.clearRect(0, 0, this._w, this._h); }
    },
    /* انفجار من عنصر معين */
    burstAt(el, opts = {}) {
      if (!el) return this.confetti(opts);
      const r = el.getBoundingClientRect();
      this.confetti(Object.assign({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, opts));
    },
    /* مطر كونفيتي من فوق (للنتيجة النهائية) */
    rain(ms = 2200) {
      const end = performance.now() + ms;
      const step = () => {
        this.confetti({ x: Math.random() * this._w || root.innerWidth * Math.random(), y: -10, count: 10, power: 3, spread: Math.PI * 0.6, angle: Math.PI / 2, gravity: 0.18 });
        if (performance.now() < end) root.setTimeout(step, 110);
      };
      this._ensureCanvas(); step();
    },

    /* ---------- اهتزاز ووميض ---------- */
    shake(el, strength = 1) {
      if (!el || this.isReduced()) return;
      el.classList.remove("fx-shake", "fx-shake-lg");
      void el.offsetWidth;
      el.classList.add(strength > 1 ? "fx-shake-lg" : "fx-shake");
      root.setTimeout(() => el.classList.remove("fx-shake", "fx-shake-lg"), 650);
    },
    flash(color = "#fff", ms = 380, opacity = 0.85) {
      const d = doc().createElement("div");
      d.className = "fx-flash"; d.style.background = color; d.style.setProperty("--fx-dur", ms + "ms"); d.style.setProperty("--fx-op", opacity);
      doc().body.appendChild(d);
      root.setTimeout(() => d.remove(), ms + 40);
    },
    pop(el) {
      if (!el || !el.animate || this.isReduced()) return;
      el.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.34,1.56,.64,1)" });
    },
    pulse(el) { this.pop(el); },

    /* ---------- نقاط طايرة: من عنصر لعنصر (+5 → Scoreboard) ---------- */
    flyPoints(fromEl, toEl, text, { color = "#ffd23f", onArrive } = {}) {
      const d = doc();
      const a = fromEl ? fromEl.getBoundingClientRect() : { left: root.innerWidth / 2, top: root.innerHeight / 2, width: 0, height: 0 };
      const b = toEl ? toEl.getBoundingClientRect() : { left: root.innerWidth - 40, top: 40, width: 0, height: 0 };
      const el = d.createElement("div");
      el.className = "fly-points"; el.textContent = text; el.style.color = color;
      const sx = a.left + a.width / 2, sy = a.top + a.height / 2;
      const ex = b.left + b.width / 2, ey = b.top + b.height / 2;
      el.style.left = sx + "px"; el.style.top = sy + "px";
      d.body.appendChild(el);
      const finish = () => { el.remove(); if (toEl) this.pop(toEl); onArrive && onArrive(); };
      if (!el.animate) { root.setTimeout(finish, 800); return; }
      const dx = ex - sx, dy = ey - sy;
      const anim = el.animate([
        { transform: "translate(-50%,-50%) scale(.3)", opacity: 0, offset: 0 },
        { transform: "translate(-50%,-90%) scale(1.5)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%,-90%) scale(1.5)", opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.5)`, opacity: 0.9, offset: 1 },
      ], { duration: 1100, easing: "cubic-bezier(.5,0,.3,1)" });
      anim.onfinish = finish; anim.oncancel = finish;
    },

    /* نص طاير بسيط فوق عنصر */
    floatText(el, text, cls = "") {
      const d = doc(); if (!el) return;
      const r = el.getBoundingClientRect();
      const t = d.createElement("div");
      t.className = "float-text " + cls; t.textContent = text;
      t.style.left = r.left + r.width / 2 + "px"; t.style.top = r.top + "px";
      d.body.appendChild(t);
      root.setTimeout(() => t.remove(), 1300);
    },

    /* عدّاد يتحرك من رقم لرقم */
    countUp(el, from, to, ms = 700) {
      if (!el) return;
      if (from === to || this.isReduced()) { el.textContent = to; return; }
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(from + (to - from) * e);
        if (k < 1) root.requestAnimationFrame(step); else el.textContent = to;
      };
      root.requestAnimationFrame(step);
    },
  };

  KF.VFX = V;
})(typeof window !== "undefined" ? window : globalThis);
