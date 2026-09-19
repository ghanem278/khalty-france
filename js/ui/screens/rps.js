/* RPS — حجر ورقة مقص. كل لاعب بيختار لوحده (الموبايل بيتسلّم) وبعدين كشف متزامن. */
(function (root) {
  const KF = root.KF, { h, button, avatar, wait } = KF.UI, C = KF.CONFIG;
  const M = KF.RPS.META;

  KF.App.register("rps", {
    meta: { chrome: "full" },
    mount(el, params, app) {
      const g = app.game;
      if (!g || g.phase !== "rps") { app.go(app.screenForPhase ? (g ? app.screenForPhase() : "splash") : "splash"); return {}; }
      el.classList.add("rps-screen");
      let alive = true;
      const [pa, pb] = g.state.pair.ids.map((id) => g.player(id));
      const stage = h("div", { style: { display: "contents" } });
      el.append(stage);

      const head = (p, label) => h("div", { class: "rps-head" }, avatar(p.avatarId, "xl"), h("div", { class: "who" }, label));

      /* اختيار لاعب واحد → Promise(choice) */
      function pickFor(p, other) {
        return new Promise((resolve) => {
          let sel = null;
          const cards = h("div", { class: "rps-choices" });
          const confirm = button("ثبّت اختيارك 🔒", { cls: "btn-lg btn-block green", disabled: true, onClick: () => { KF.Audio.play("click"); KF.Haptics.buzz("select"); resolve(sel); } });
          KF.RPS.CHOICES.forEach((c) => {
            const b = h("button", { type: "button", class: "rps-card", "aria-pressed": "false", "aria-label": M[c].label },
              h("span", { class: "e" }, M[c].emoji), h("span", { class: "l" }, M[c].label));
            b.addEventListener("click", () => {
              sel = c; confirm.disabled = false;
              cards.querySelectorAll(".rps-card").forEach((x) => { x.classList.remove("sel"); x.classList.add("dim"); x.setAttribute("aria-pressed", "false"); });
              b.classList.remove("dim"); b.classList.add("sel"); b.setAttribute("aria-pressed", "true");
            });
            cards.append(b);
          });
          stage.replaceChildren(
            head(p, `دورك يا ${p.name}`),
            h("p", { class: "muted center", style: { fontWeight: 800 } }, `اختار من غير ما ${other.name} يشوف 🤫`),
            cards,
            h("div", { style: { marginTop: "auto", width: "100%" } }, confirm),
            h("div", { style: { width: "100%", paddingTop: "8px" } }, button("تعدّي (لفّ من جديد)", { cls: "ghost btn-sm btn-block", sfx: "click", onClick: async () => {
              const ok = await KF.UI.dialog({ emoji: "⏭️", title: "نتخطى الزوج ده؟", text: "مفيش نقاط ومفيش تحدي — هنلف من جديد.", buttons: [{ label: "أيوه تعدّي", cls: "primary", value: true }, { label: "لأ", cls: "ghost", value: false }] });
              if (ok) { g.skipPair(); app.sync("main"); }
            } })));
        });
      }

      function handoff(to) {
        return new Promise((resolve) => {
          stage.replaceChildren(h("div", { class: "handoff" },
            h("div", { class: "big-emoji" }, "📱"),
            avatar(to.avatarId, "xl"),
            h("div", { class: "display h2", style: { color: "#fff", WebkitTextStroke: "5px var(--ink)", paintOrder: "stroke fill", textShadow: "0 4px 0 var(--ink)" } }, `سلّم الموبايل لـ ${to.name}`),
            h("p", { class: "muted", style: { fontWeight: 700 } }, "اختيار اللاعب اللي فات اتخبّى 🙈"),
            button(`أنا ${to.name} — جاهز`, { cls: "btn-lg btn-block yellow", onClick: resolve })));
          KF.Audio.play("modal");
        });
      }

      async function countdown() {
        for (let n = C.rps.countdownSteps; n >= 1; n--) {
          if (!alive) return;
          const word = n === 3 ? "حجر" : n === 2 ? "ورقة" : "مقص";
          stage.replaceChildren(h("div", { class: "stage" },
            h("div", { class: "duel" }, avatar(pa.avatarId, "lg"), avatar(pb.avatarId, "lg")),
            h("div", { class: "count-num", key: n }, String(n)),
            h("div", { class: "result-banner", style: { fontSize: "36px" } }, word + "…")));
          KF.Audio.play("rpsCountdown"); KF.Haptics.buzz("tick");
          await wait(780);
        }
      }

      async function round() {
        if (!alive) return;
        stage.replaceChildren();
        const ca = await pickFor(pa, pb); if (!alive) return;
        await handoff(pb); if (!alive) return;
        const cb = await pickFor(pb, pa); if (!alive) return;
        await countdown(); if (!alive) return;

        const res = g.submitRps(ca, cb);
        app.saveSession();
        KF.Audio.play("rpsReveal"); KF.Haptics.buzz("shake"); KF.VFX.flash("#fff", 300, 0.7);
        const side = (p, choice, cls) => h("div", { class: "card duel-side " + cls },
          avatar(p.avatarId, ""), h("div", { class: "nm" }, p.name), h("div", { class: "hand" }, M[choice].emoji), h("div", { class: "tiny", style: { fontWeight: 800 } }, M[choice].label));
        const sa = side(pa, ca, "a"), sb = side(pb, cb, "b");
        const duel = h("div", { class: "duel" }, sa, sb);

        if (res.result === "draw") {
          stage.replaceChildren(h("div", { class: "stage" }, duel, h("div", { class: "result-banner" }, "تعادل! 🤝"), h("div", { class: "result-sub muted" }, "بنعيد من الأول…")));
          KF.Audio.play("draw"); KF.VFX.shake(el, 1);
          await wait(C.rps.drawRestartMs);
          return round();
        }
        const win = g.player(res.winnerId), lose = g.player(res.loserId);
        (res.winnerId === pa.id ? sa : sb).classList.add("winner");
        (res.winnerId === pa.id ? sb : sa).classList.add("loser");
        await wait(650);
        KF.Audio.play("win"); KF.VFX.confetti({ count: 70 }); KF.Haptics.buzz("win");
        const goBtn = button("كمّل ▶", { cls: "btn-lg btn-block", onClick: () => proceed() });
        stage.replaceChildren(h("div", { class: "stage" }, duel,
          h("div", { class: "result-banner" }, `${win.name} كسب! 🏆`),
          h("div", { class: "result-sub" }, `🏃💨 ${win.name} فلت من التحدي`),
          h("div", { class: "result-sub", style: { color: "var(--accent)" } }, `😈 ${lose.name} هياخد التحدي`),
          h("div", { style: { width: "100%", marginTop: "auto" } }, goBtn)));
        KF.Audio.play("lose");
      }

      async function proceed() {
        const r = g.beginChallenge();
        if (r.ok) return app.sync("challenge");
        // مفيش تحديات متاحة
        const v = await KF.UI.dialog({ emoji: "🎉", title: "التحديات خلصت!", text: "نخلّص اللعبة ولا نعيد التحديات من الأول؟",
          buttons: [{ label: "🏁 النتائج", cls: "yellow", value: "end" }, { label: "🔁 نعيد التحديات", cls: "green", value: "again" }], dismissible: false });
        if (v === "again") { g.recycleChallenges(); proceed(); } else app.endGame();
      }

      round();
      return { destroy() { alive = false; } };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
