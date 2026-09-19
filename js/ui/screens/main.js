/* Main — العجلة (سهمين عكس بعض) + كشف الاتنين + سكور مصغّر */
(function (root) {
  const KF = root.KF, { h, button, avatar, icon, wait } = KF.UI, C = KF.CONFIG;
  const doc = root.document;

  function cssVar(name, fb) { const v = getComputedStyle(doc.documentElement).getPropertyValue(name).trim(); return v || fb; }
  const easeOut = (t) => 1 - Math.pow(1 - t, 4.2);

  KF.App.register("main", {
    meta: { chrome: "full" },
    mount(el, params, app) {
      const g = app.game;
      if (!g) { app.go("splash"); return {}; }
      el.classList.add("main-screen");
      let alive = true, spinning = false, angle = 0, raf = 0;
      const imgCache = {};

      /* ---------- الهيكل ---------- */
      const roundChip = h("span", { class: "chip yellow" }, "الدورة " + g.round);
      const leftChip = h("span", { class: "chip teal" }, "");
      const wheelZone = h("div", { class: "wheel-zone" });
      const rim = h("div", { class: "rim" });
      const canvas = h("canvas", { "aria-label": "عجلة اختيار اللاعبين", role: "img" });
      const streak = h("div", { class: "streak" });
      const bulbs = h("div", { class: "bulbs", "aria-hidden": "true" });
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        bulbs.append(h("div", { class: "bulb", style: { left: 50 + 49 * Math.sin(a) + "%", top: 50 - 49 * Math.cos(a) + "%" } }));
      }
      const hub = h("div", { class: "hub" }, "لفّ!");
      const arrowSvg = () => { const s = doc.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 60 80"); s.innerHTML = '<path d="M30 76 L4 14 Q30 -4 56 14 Z" fill="#ff3d8b" stroke="#1a0f3a" stroke-width="5" stroke-linejoin="round"/><circle cx="30" cy="22" r="7" fill="#fff8e6" stroke="#1a0f3a" stroke-width="4"/>'; return s; };
      const ptTop = h("div", { class: "pointer top" }, arrowSvg());
      const ptBot = h("div", { class: "pointer bottom" }, arrowSvg());
      wheelZone.append(rim, canvas, streak, bulbs, hub, ptTop, ptBot);

      const spinBtn = button("لفّ العجلة", { cls: "btn-lg btn-block pulse-cta", icon: "refresh", onClick: () => spin() });
      const endBtn = button("🏁 إنهاء اللعبة", { cls: "ghost btn-sm", onClick: () => app.openScoreboard(), sfx: "click" });
      const mini = h("div", { class: "mini-board" });

      el.append(
        h("div", { class: "round-row" }, roundChip, leftChip),
        wheelZone,
        h("div", { class: "spin-zone" }, spinBtn, mini),
        h("div", { style: { marginTop: "auto", display: "flex", justifyContent: "center", paddingTop: "8px" } }, endBtn));

      function renderMini() {
        mini.replaceChildren();
        g.players.forEach((p) => {
          const sc = h("span", { class: "sc" }, String(app.lastScoreSnapshot[p.id] != null ? app.lastScoreSnapshot[p.id] : p.score));
          mini.append(h("div", { class: "mini-chip" + (p.hasCompletedCurrentRound ? " done" : ""), title: p.name },
            avatar(p.avatarId, "sm", { rot: 0 }), h("span", { style: { maxWidth: "76px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.name), sc,
            p.hasCompletedCurrentRound ? h("span", { class: "tick" }, "✓") : null));
          if (app.lastScoreSnapshot[p.id] != null && app.lastScoreSnapshot[p.id] !== p.score) {
            KF.VFX.countUp(sc, app.lastScoreSnapshot[p.id], p.score, 700);
            root.setTimeout(() => KF.VFX.pop(sc.parentElement), 600);
          }
          app.lastScoreSnapshot[p.id] = p.score;
        });
        leftChip.textContent = "التحديات المتبقية: " + g.challengesLeft();
        roundChip.textContent = "الدورة " + g.round;
      }

      /* ---------- رسم العجلة ---------- */
      let layout = null, size = 0, dpr = 1;
      function playerColor(id) {
        const i = Math.max(0, g.players.findIndex((p) => p.id === id));
        return cssVar("--wheel-" + ((i % 10) + 1), "#ff3d8b");
      }
      function loadImg(src) {
        if (!imgCache[src]) { const im = new Image(); im.src = src; im.onload = () => draw(); imgCache[src] = im; }
        return imgCache[src];
      }
      function setupCanvas() {
        const r = wheelZone.getBoundingClientRect();
        size = Math.round(r.width) || 300;
        dpr = Math.min(2.5, root.devicePixelRatio || 1);
        canvas.width = size * dpr; canvas.height = size * dpr;
      }
      function draw() {
        if (!alive || !layout) return;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        const M = layout.M, seg = (Math.PI * 2) / M, R = size / 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        ctx.save(); ctx.translate(R, R);
        const ink = cssVar("--ink", "#1a0f3a");
        for (let i = 0; i < M; i++) {
          const pid = layout.slots[i], p = g.player(pid);
          const a0 = -Math.PI / 2 + i * seg, a1 = a0 + seg;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R - 2, a0, a1); ctx.closePath();
          ctx.fillStyle = playerColor(pid); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.stroke();
          // كل قطعة: الأفاتار عند الحافة والاسم ناحية المركز، مقروء من المركز للخارج
          ctx.save();
          ctx.rotate(a0 + seg / 2);
          const sliceH = 2 * (R * 0.62) * Math.sin(seg / 2);       // ارتفاع القطعة عند 62% من نصف القطر
          const av = KF.UI.avatarData(p.avatarId);
          const avSize = Math.max(16, Math.min(R * 0.24, sliceH * 0.8));
          const fs = Math.max(12, Math.min(R * 0.14, sliceH * 0.46));
          const rimX = R * 0.93, textEnd = rimX - avSize - 6, textStart = R * 0.30;
          // الاسم: بيتكتب من الحافة لناحية المركز، وبنقلبه لو القطعة في النص الشمال عشان يفضل مقروء
          const mid = a0 + seg / 2, flip = Math.cos(mid) < -0.001;
          ctx.font = `400 ${fs}px Lalezar, Baloo, system-ui, sans-serif`;
          ctx.textBaseline = "middle"; ctx.lineJoin = "round";
          let name = p.name, maxW = textEnd - textStart;
          while (ctx.measureText(name).width > maxW && name.length > 2) name = name.slice(0, -1);
          if (name !== p.name) name = name.trim() + "…";
          ctx.save();
          if (flip) { ctx.translate((textEnd + textStart) / 2, 0); ctx.rotate(Math.PI); ctx.textAlign = "center"; ctx.lineWidth = fs * 0.3; ctx.strokeStyle = ink; ctx.strokeText(name, 0, 2); ctx.fillStyle = "#fff"; ctx.fillText(name, 0, 2); }
          else { ctx.textAlign = "center"; ctx.lineWidth = fs * 0.3; ctx.strokeStyle = ink; ctx.strokeText(name, (textEnd + textStart) / 2, 2); ctx.fillStyle = "#fff"; ctx.fillText(name, (textEnd + textStart) / 2, 2); }
          ctx.restore();
          // الأفاتار (دايرة بيضاء + إيموجي/صورة) مقلوب برضو عشان يفضل عدل
          ctx.save();
          ctx.translate(rimX - avSize / 2, 0); if (flip) ctx.rotate(Math.PI);
          ctx.beginPath(); ctx.arc(0, 0, avSize / 2 + 2, 0, Math.PI * 2); ctx.fillStyle = av.bg || "#fff"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = ink; ctx.stroke();
          if (av.image) { const im = loadImg(av.image); if (im.complete && im.naturalWidth) ctx.drawImage(im, -avSize * 0.42, -avSize * 0.42, avSize * 0.84, avSize * 0.84); }
          else { ctx.font = `${avSize * 0.68}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#000"; ctx.fillText(av.emoji || "🙂", 0, avSize * 0.04); }
          ctx.restore();
          ctx.restore();
        }
        ctx.restore();
      }
      function initialLayout() {
        // لوحة العرض قبل أول لفة: نرتب اللاعبين بالترتيب (بدون ضمان أحد)
        const ids = g.players.map((p) => p.id);
        const N = ids.length;
        if (N % 2 === 0) return { slots: ids.slice(), M: N, top: 0, bottom: N / 2 };
        const slots = ids.concat(ids.map((_, i) => ids[(i + 1) % N]));
        return { slots, M: 2 * N, top: 0, bottom: N };
      }

      /* ---------- اللف ---------- */
      function setAngle(a) { angle = a; canvas.style.transform = `rotate(${a}deg)`; }

      async function spin() {
        if (spinning || g.phase !== "wheel") return;
        if (g.challengesLeft() === 0) return offerEnd();
        const r = g.spin();
        if (!r.ok) return;
        app.saveSession();
        spinning = true;
        spinBtn.disabled = true; endBtn.disabled = true;
        layout = r.pair.layout; draw();
        wheelZone.classList.add("spinning"); wheelZone.classList.remove("landed");
        KF.Audio.play("wheelSpin"); KF.Haptics.buzz("tap");

        const rnd = Math.random;
        const [dMin, dMax] = C.wheel.spinMs, [tMin, tMax] = C.wheel.extraTurns;
        const dur = KF.VFX.isReduced() ? 2600 : dMin + rnd() * (dMax - dMin);
        const turns = KF.VFX.isReduced() ? 3 : tMin + Math.floor(rnd() * (tMax - tMin + 1));
        const a0 = angle % 360;
        setAngle(a0);
        const a1 = KF.Roulette.landingAngle(layout, a0, turns, rnd, C.wheel.jitter);
        const seg = 360 / layout.M;
        let lastSlot = KF.Roulette.slotAtTop(a0, layout.M);
        const t0 = performance.now(); let prevA = a0;
        const flap = (pt) => pt.animate && pt.animate([{ rotate: "0deg" }, { rotate: pt.classList.contains("bottom") ? "16deg" : "-16deg" }, { rotate: "0deg" }], { duration: 110 });

        await new Promise((resolve) => {
          const frame = (now) => {
            if (!alive) return resolve();
            const t = Math.min(1, (now - t0) / dur);
            const a = a0 + (a1 - a0) * easeOut(t);
            const speed = a - prevA; prevA = a;
            setAngle(a);
            streak.style.opacity = String(Math.min(0.55, speed / 22));
            const s = KF.Roulette.slotAtTop(a, layout.M);
            if (s !== lastSlot) { lastSlot = s; KF.Audio.tick(speed); KF.Haptics.buzz("tick"); flap(ptTop); flap(ptBot); }
            if (t < 1) raf = root.requestAnimationFrame(frame); else resolve();
          };
          raf = root.requestAnimationFrame(frame);
        });
        if (!alive) return;
        streak.style.opacity = "0";
        setAngle(a1 % 360 + 0);   // نفس الوضع بصريًا
        // تحقق أمان: القطعتين تحت السهمين لازم يكونوا هم المختارين
        const topId = layout.slots[KF.Roulette.slotAtTop(angle, layout.M)];
        const botId = layout.slots[KF.Roulette.slotAtTop(angle + 180, layout.M)];
        if (!(r.pair.ids.includes(topId) && r.pair.ids.includes(botId) && topId !== botId)) console.warn("wheel/pair mismatch", topId, botId, r.pair.ids);
        wheelZone.classList.remove("spinning"); wheelZone.classList.add("landed");
        KF.Audio.play("wheelStop"); KF.Haptics.buzz("select"); KF.VFX.flash("#fff", 420, 0.55);
        await wait(650);
        if (!alive) return;
        spinning = false;
        showPair(r.pair);
      }

      /* ---------- كشف الاتنين ---------- */
      function showPair(pair) {
        const [a, b] = pair.ids.map((id) => g.player(id));
        const guest = pair.guestId ? g.player(pair.guestId) : null;
        const needy = guest ? (guest.id === a.id ? b : a) : null;
        KF.Audio.play("playerSelected"); KF.VFX.confetti({ count: 110 });
        const side = (p, cls) => h("div", { class: "contender " + cls }, avatar(p.avatarId, "xl"), h("div", { class: "nm" }, p.name));
        const ov = h("div", { class: "pair-overlay", role: "dialog", "aria-label": "اللاعبين المختارين" },
          h("div", { class: "display h2", style: { color: "#fff", WebkitTextStroke: "5px var(--ink)", paintOrder: "stroke fill", textShadow: "0 4px 0 var(--ink)" } }, "اتحدّدوا!"),
          h("div", { class: "vs-row" }, side(a, "left"), h("div", { class: "vs-badge" }, "VS"), side(b, "right")),
          guest ? h("div", { class: "guest-note" }, `${needy.name} لسه ما خدش دوره، فـ${guest.name} معاه كضيف. ولو ${guest.name} خسر هيتحسب له في الدورة الجاية.`) : null,
          button("يلا حجر ورقة مقص ✊", { cls: "btn-lg btn-block yellow", onClick: () => { g.startRps(); app.sync("rps"); } }),
          button("تعدّي (لفّ من جديد)", { cls: "ghost btn-sm", onClick: () => { g.skipPair(); app.saveSession(); ov.remove(); afterSkip(); } }));
        el.append(ov);
      }
      function afterSkip() { spinning = false; spinBtn.disabled = false; endBtn.disabled = false; renderMini(); wheelZone.classList.remove("landed"); }

      async function offerEnd() {
        const v = await KF.UI.dialog({ emoji: "🎉", title: "التحديات خلصت!", text: "عايزين نخلّص ونشوف النتيجة ولا نعيد التحديات من الأول؟",
          buttons: [{ label: "🏁 النتائج", cls: "yellow", value: "end" }, { label: "🔁 نعيد التحديات", cls: "green", value: "again" }, { label: "إلغاء", cls: "ghost", value: "no" }] });
        if (v === "end") app.endGame();
        else if (v === "again") { g.recycleChallenges(); app.saveSession(); renderMini(); KF.UI.toast("التحديات اتعادت 🔁"); }
      }

      /* ---------- بدء ---------- */
      const onResize = () => { setupCanvas(); draw(); };
      root.addEventListener("resize", onResize);
      root.requestAnimationFrame(() => {
        setupCanvas();
        layout = (g.state.pair && g.state.pair.layout) || initialLayout();
        setAngle(0); draw(); renderMini();
        // لو رجعنا من ريفرش وهو في مرحلة "selected": نضبط العجلة على الاتنين ونعرضهم
        if (g.phase === "selected" && g.state.pair) {
          setAngle(KF.Roulette.landingAngle(layout, 0, 0, () => 0.5, 0));
          draw(); showPair(g.state.pair);
        } else if (g.challengesLeft() === 0) { root.setTimeout(offerEnd, 500); }
      });
      // الخطوط بتتحمل متأخر أحيانًا → نعيد الرسم
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => draw());

      return { destroy() { alive = false; root.cancelAnimationFrame(raf); root.removeEventListener("resize", onResize); } };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
