/* Challenge — عرض التحدي + تم/لأ + وسائل الهروب + الجولدن كارد + مهلة الـ70 ثانية */
(function (root) {
  const KF = root.KF, { h, button, avatar, icon, wait, sheet, close, dialog } = KF.UI, C = KF.CONFIG;

  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  function sizeClass(t) { const n = t.length; return n <= 34 ? "s-xl" : n <= 70 ? "s-l" : n <= 120 ? "s-m" : "s-s"; }

  KF.App.register("challenge", {
    meta: { chrome: "full" },
    mount(el, params, app) {
      const g = app.game;
      if (!g || g.phase !== "challenge" || !g.currentChallenge) { app.go(g ? app.screenForPhase() : "splash"); return {}; }
      el.classList.add("ch-screen");
      let alive = true, busy = false, timeoutId = 0, timerId = 0, escLayer = null;
      let tLeft = 0, tRunning = false;

      const who = h("div", { class: "who" });
      const gcBadge = h("span", { class: "gc-state" });
      const top = h("div", { class: "ch-top" });
      const cardWrap = h("div", { class: "ch-card-wrap" });
      const dock = h("div", { class: "ch-dock" });
      el.append(top, cardWrap, dock);

      const player = () => g.challengePlayer;

      /* ---------- رسم الشاشة ---------- */
      function render(reveal = true) {
        const p = player(), ch = g.currentChallenge, cat = KF.DATA.categories[ch.category] || KF.DATA.categories.random;
        who.textContent = p.name;
        gcBadge.className = "gc-state " + (p.goldenCardAvailable ? "avail" : "used");
        gcBadge.textContent = p.goldenCardAvailable ? "🃏 جولدن كارد متاحة" : "🃏 مستخدمة";
        top.replaceChildren(avatar(p.avatarId, "lg"), h("div", { class: "stack", style: { gap: "4px", alignItems: "flex-start" } }, h("div", { class: "who" }, "دورك يا " + p.name), gcBadge));

        const card = h("div", { class: "ch-card" + (reveal ? " reveal" : "") });
        card.append(h("div", { class: "ch-meta" },
          h("span", { class: "chip pink" }, `${cat.icon} ${cat.label}`),
          h("span", { class: "chip yellow" }, `⭐ ${g.state.challenge.points} نقاط`),
          g.state.challenge.changedByGolden ? h("span", { class: "chip" }, "🃏 تحدي جديد") : null));
        card.append(h("div", { class: "ch-text " + sizeClass(ch.text) }, h("span", null, ch.text)));
        if (ch.flags.includes("physical")) card.append(h("div", { class: "ch-warn" }, "⚠️ نفّذ فقط لو ده آمن ومناسب ليك — ومن حقك ترفض وتهرب."));
        if (ch.flags.includes("external")) card.append(h("div", { class: "ch-warn info" }, "📱 اللعبة مش هتبعت ولا تتصل بحد — انت اللي بتنفّذ وتأكّد."));
        if (ch.duration) card.append(buildTimer(ch.duration));
        cardWrap.replaceChildren(card);

        dock.replaceChildren(
          h("div", { class: "ask" }, "نفّذت التحدي؟"),
          h("div", { class: "pair" },
            button("تم", { cls: "green btn-lg", icon: "check", onClick: () => done() }),
            button("لأ", { cls: "red btn-lg", icon: "x", onClick: () => openEscapes() })),
          h("div", { class: "pair" },
            p.goldenCardAvailable ? button("🃏 جولدن كارد", { cls: "gold gold-shine", onClick: () => useGolden() }) : button("🃏 مستخدمة", { cls: "ghost", disabled: true }),
            button("🆘 هروب", { cls: "paper", onClick: () => openEscapes() })));
        if (reveal) { KF.Audio.play("challengeReveal"); KF.Haptics.buzz("select"); KF.VFX.confetti({ count: 40, y: innerHeight * 0.35, power: 8 }); }
        armTimeout();
      }

      /* ---------- عدّاد التحدي ---------- */
      function buildTimer(sec) {
        tLeft = sec; tRunning = false;
        const clock = h("div", { class: "clock" }, fmt(sec));
        const box = h("div", { class: "ch-timer" });
        const btn = button("ابدأ العدّاد", { cls: "teal btn-sm", icon: "play", onClick: () => {
          if (tRunning) { stopTimer(); btn.querySelector("span").textContent = "كمّل"; return; }
          tRunning = true; btn.querySelector("span").textContent = "إيقاف";
          disarmTimeout();
          timerId = root.setInterval(() => {
            tLeft--; clock.textContent = fmt(Math.max(0, tLeft));
            box.classList.toggle("warn", tLeft <= C.timers.warningSec && tLeft > 0);
            if (tLeft <= C.timers.warningSec && tLeft > 0) { KF.Audio.play("timerWarning"); KF.Haptics.buzz("tick"); }
            if (tLeft <= 0) { stopTimer(); KF.Audio.play("timerEnd"); KF.Haptics.buzz("success"); KF.VFX.flash("#4fd15f", 500, 0.5); btn.querySelector("span").textContent = "خلص!"; btn.disabled = true; box.classList.remove("warn"); armTimeout(); }
          }, 1000);
        } });
        box.append(h("span", { style: { fontSize: "26px" } }, "⏱"), clock, btn);
        return box;
      }
      function stopTimer() { tRunning = false; if (timerId) { root.clearInterval(timerId); timerId = 0; } }

      /* ---------- مهلة الـ70 ثانية ---------- */
      function armTimeout() {
        disarmTimeout();
        timeoutId = root.setTimeout(fireTimeout, C.timers.challengeTimeoutSec * 1000);
      }
      function disarmTimeout() { if (timeoutId) { root.clearTimeout(timeoutId); timeoutId = 0; } }
      async function fireTimeout() {
        if (!alive || busy || (escLayer && !escLayer.closed) || KF.UI.hasLayer()) { if (alive) armTimeout(); return; }
        const p = player();
        const fx = h("div", { class: "timeout-fx" },
          h("div", { class: "big" }, "😡"),
          h("div", { class: "say" }, C.timeoutLine),
          h("div", { class: "who2" }, `يلا يا ${p.name}.. قرّر!`),
          button("ماشي ماشي 🙏", { cls: "yellow btn-lg", onClick: () => { fx.remove(); KF.Audio.stopVoice(); armTimeout(); } }));
        el.append(fx);
        KF.Audio.play("timeout"); KF.Haptics.buzz("shake"); KF.VFX.shake(el, 2); KF.VFX.flash("#ff4b3e", 500, 0.6);
        KF.Audio.duck(true);
        KF.Audio.playVoice("khaltyTimeout").then(() => KF.Audio.duck(false));
      }

      /* ---------- تم ---------- */
      async function done() {
        if (busy) return; busy = true; disarmTimeout(); stopTimer();
        const p = player(), pts = g.state.challenge.points;
        const from = el.querySelector(".ch-card");
        const r = g.completeChallenge();
        if (!r.ok) { busy = false; return; }
        KF.Audio.play("success"); KF.Haptics.buzz("success"); KF.VFX.confetti({ count: 110 });
        KF.Audio.play("score");
        KF.VFX.flyPoints(from, app.btnBoard, "+" + pts);
        await wait(1000);
        app.saveSession();
        if (r.newRound) KF.UI.toast(`🔄 دورة جديدة! (الدورة ${r.round})`);
        app.go("main");
      }

      /* ---------- الجولدن كارد ---------- */
      async function useGolden() {
        if (busy) return;
        const p = player();
        if (!KF.Golden.canUse(p)) { KF.Audio.play("error"); return; }
        busy = true; disarmTimeout(); stopTimer();
        const r = g.useGolden();
        if (!r.ok) { busy = false; KF.Audio.play("error"); KF.UI.toast(r.reason === "noChallenge" ? "مفيش تحدي بديل — الكارت لسه معاك 🃏" : "مينفعش دلوقتي"); armTimeout(); return; }
        app.saveSession();
        const anim = h("div", { class: "golden-anim" }, h("div", { class: "golden-card" }, h("div", null, "🃏", h("small", null, "جولدن كارد"))));
        el.append(anim);
        KF.Audio.play("goldenCard"); KF.Haptics.buzz("golden"); KF.VFX.confetti({ count: 120, colors: ["#ffe27a", "#ffd23f", "#f5a300", "#fff"] });
        await wait(1700);
        if (!alive) return;
        anim.remove(); busy = false;
        render(true);
      }

      /* ---------- وسائل الهروب ---------- */
      function openEscapes() {
        if (busy || (escLayer && !escLayer.closed)) return;
        disarmTimeout();
        const list = h("div", { class: "esc-list" });
        g.availableEscapes().forEach((e, i) => {
          const isGold = e.special === "golden";
          const pts = h("div", { class: "pts" }, isGold ? "🔄" : "+" + e.points, h("small", null, isGold ? "تغيير" : "نقاط"));
          const card = h("button", { type: "button", class: "esc-card" + (isGold ? " gold gold-shine" : "") + (e.disabled ? " off" : ""), style: { animationDelay: i * 60 + "ms" }, "aria-disabled": String(!!e.disabled) },
            h("div", { class: "ei" }, e.icon),
            h("div", { class: "grow" }, h("div", { class: "et" }, e.title), h("div", { class: "ed" }, e.disabled && e.reason === "used" ? "اتستخدمت قبل كده" : e.desc + (e.money ? ` (+${e.money} للصندوق)` : ""))),
            pts);
          card.addEventListener("click", () => {
            if (e.disabled) return;
            if (isGold) { close(escLayer); useGolden(); } else performEscape(e);
          });
          list.append(card);
        });
        const skip = C.allowSkipChallenge ? button("⏭ تعدّي بدون نقاط", { cls: "ghost btn-sm btn-block", sfx: "click", attrs: { style: "color:var(--ink);border-color:var(--ink);box-shadow:0 3px 0 var(--ink)" }, onClick: async () => {
          const ok = await dialog({ emoji: "⏭️", title: "تعدّي؟", text: "مفيش نقاط ودورك مش هيتحسب — وممكن التحدي ده يرجعلك تاني في لفة تانية.", buttons: [{ label: "تعدّي", cls: "primary", value: true }, { label: "لأ", cls: "ghost", value: false }] });
          if (!ok) return;
          close(escLayer); g.skipChallenge(); app.saveSession(); KF.UI.toast("اتعدّى — مفيش نقاط"); app.go("main");
        } }) : null;
        escLayer = sheet({ title: "🆘 وسائل الهروب", content: h("div", { class: "stack" }, h("p", { style: { fontWeight: 700, margin: "0 4px" } }, "مش عايز تنفّذ؟ اختار طريقة هروب — وخد نقاطها بعد ما تنفّذها."), list, skip),
          onClose: () => { if (alive && !busy) armTimeout(); } });
      }

      function performEscape(e) {
        // شاشة تنفيذ داخل نفس الـsheet
        const body = escLayer.body;
        let clockEl = null, tid = 0, left = e.timer || 0, started = false;
        const confirmBtn = button("تم ✅ (+" + e.points + " نقاط)", { cls: "green btn-lg btn-block", disabled: !!e.timer, onClick: async () => {
          if (busy) return; busy = true; root.clearInterval(tid);
          const from = confirmBtn;
          const r = g.useEscape(e.id);
          if (!r.ok) { busy = false; KF.Audio.play("error"); return; }
          KF.Audio.play(e.sfx || "success"); KF.Haptics.buzz(e.id === "belt" ? "fail" : "success");
          if (r.money) { KF.Audio.play("money"); KF.VFX.floatText(from, `💰 +${r.money} للصندوق`); const pv = document.getElementById("pool-val"); if (pv) KF.VFX.countUp(pv, app.game.state.prizePool - r.money, app.game.state.prizePool, 600); KF.VFX.pop(app.poolChip); }
          KF.VFX.confetti({ count: 80 }); KF.Audio.play("score");
          KF.VFX.flyPoints(from, app.btnBoard, "+" + r.points);
          await wait(900);
          close(escLayer); app.saveSession();
          if (r.newRound) KF.UI.toast(`🔄 دورة جديدة! (الدورة ${r.round})`);
          app.go("main");
        } });
        const parts = [
          h("div", { class: "big" }, e.icon),
          h("div", { class: "display h2", style: { color: "var(--ink)" } }, e.title),
          h("p", { style: { fontWeight: 700 } }, e.desc),
        ];
        if (e.flags && e.flags.includes("belt")) parts.push(h("div", { class: "ch-warn" }, "⚠️ خفيفة ومتفق عليها فقط، وممكن ترفض في أي وقت. ولو مش مرتاح اختار وسيلة تانية."));
        else if (e.flags && e.flags.includes("physical")) parts.push(h("div", { class: "ch-warn" }, "⚠️ نفّذ فقط لو ده آمن ومناسب ليك."));
        if (e.money) parts.push(h("div", { class: "chip green" }, `💰 الصندوق هيبقى ${g.state.prizePool + e.money} ${C.money.currency}`));
        if (e.timer) {
          clockEl = h("div", { class: "plank-clock" }, fmt(left));
          const startBtn = button("ابدأ العدّاد ▶", { cls: "teal btn-sm", onClick: (ev, b) => {
            if (started) return; started = true; b.disabled = true;
            tid = root.setInterval(() => {
              left--; clockEl.textContent = fmt(Math.max(0, left));
              if (left <= C.timers.warningSec && left > 0) KF.Audio.play("timerWarning");
              if (left <= 0) { root.clearInterval(tid); KF.Audio.play("timerEnd"); KF.Haptics.buzz("success"); confirmBtn.disabled = false; clockEl.textContent = "برافو! 💪"; }
            }, 1000);
          } });
          parts.push(clockEl, startBtn);
        }
        parts.push(confirmBtn, button("رجوع للوسائل", { cls: "ghost btn-sm", sfx: "click", attrs: { style: "color:var(--ink);border-color:var(--ink);box-shadow:0 3px 0 var(--ink)" }, onClick: () => { root.clearInterval(tid); close(escLayer); openEscapes(); } }));
        body.replaceChildren(h("div", { class: "esc-do" }, parts));
      }

      render(!params.noReveal);
      return { destroy() { alive = false; disarmTimeout(); stopTimer(); KF.Audio.stopVoice(); KF.Audio.duck(false); } };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
