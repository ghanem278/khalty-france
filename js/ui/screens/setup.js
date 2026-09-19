/* Setup — عدد اللاعبين ← الأسماء والأفاتارات ← ابدأ */
(function (root) {
  const KF = root.KF, { h, button, avatar, sheet, close, toast, iconButton } = KF.UI, C = KF.CONFIG;

  KF.App.register("setup", {
    meta: { chrome: "minimal" },
    mount(el, params, app) {
      const { min, max, nameMaxLength } = C.players;
      let step = 1;
      let count = 4;
      let specs = [];            // [{name, avatarId}]
      const avatars = KF.DATA.avatars;
      const body = h("div", { style: { display: "contents" } });
      el.append(body);

      /* أفاتارات افتراضية مختلفة */
      const defaultAvatarFor = (taken) => (avatars.find((a) => !taken.includes(a.id)) || avatars[0]).id;
      const ensureSpecs = () => {
        specs = specs.slice(0, count);
        while (specs.length < count) specs.push({ name: "", avatarId: defaultAvatarFor(specs.map((s) => s.avatarId)) });
      };

      /* ---------- الخطوة 1: العدد ---------- */
      function renderCount() {
        step = 1;
        const grid = h("div", { class: "count-picker" });
        for (let n = min; n <= max; n++) {
          const b = h("button", { type: "button", class: "count-btn" + (n === count ? " sel" : ""), "aria-pressed": String(n === count), "aria-label": n + " لاعبين" },
            String(n), h("small", null, n === 2 ? "لاعبين" : n <= 10 ? "لاعبين" : ""));
          b.addEventListener("click", () => {
            count = n;
            grid.querySelectorAll(".count-btn").forEach((x) => { x.classList.remove("sel"); x.setAttribute("aria-pressed", "false"); });
            b.classList.add("sel"); b.setAttribute("aria-pressed", "true");
            KF.Haptics.buzz("select");
          });
          grid.append(b);
        }
        body.replaceChildren(
          h("div", { class: "screen-head" }, h("div", { class: "display h1" }, "كام لاعب؟"), h("p", { class: "muted", style: { fontWeight: 700 } }, `من ${min} لـ ${max} لاعبين`)),
          h("div", { class: "scroll" }, grid),
          h("div", { class: "dock" },
            button("التالي", { cls: "btn-lg btn-block", onClick: () => { ensureSpecs(); renderPlayers(); } }),
            button("رجوع", { cls: "ghost btn-sm", onClick: () => app.prev(), sfx: "click" })));
      }

      /* ---------- الخطوة 2: الأسماء ---------- */
      function renderPlayers() {
        step = 2;
        const rows = h("div", { class: "player-rows" });
        const fields = [];
        specs.forEach((s, i) => {
          const avHolder = h("button", { type: "button", class: "av-btn", "aria-label": "غيّر الأفاتار للاعب " + (i + 1) });
          const drawAv = () => { avHolder.replaceChildren(avatar(s.avatarId, "lg"), h("span", { class: "edit" }, "✎")); };
          drawAv();
          avHolder.addEventListener("click", () => openAvatarPicker(i, () => drawAv()));
          const f = h("input", { class: "field", type: "text", value: s.name, placeholder: "لاعب " + (i + 1), maxlength: String(nameMaxLength), autocomplete: "off", "aria-label": "اسم اللاعب " + (i + 1), enterkeyhint: i === specs.length - 1 ? "done" : "next" });
          f.addEventListener("input", () => { s.name = f.value; f.classList.remove("invalid"); });
          f.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); (fields[i + 1] || f).focus(); if (!fields[i + 1]) f.blur(); } });
          fields.push(f);
          rows.append(h("div", { class: "card player-row", style: { animationDelay: i * 50 + "ms" } }, avHolder, f));
        });

        const start = () => {
          const { names, notes } = KF.Players.sanitizeNames(specs.map((s) => s.name), { maxLength: nameMaxLength });
          const dup = notes.filter((n) => n.kind === "duplicate");
          if (dup.length) toast("في أسماء متكررة — ضفنا رقم عشان نفرّق بينهم 👍");
          const players = KF.Players.buildPlayers(specs.map((s, i) => ({ name: names[i], avatarId: s.avatarId })), { maxLength: nameMaxLength + 3 });
          app.startGame(players);
          KF.Audio.play("win"); KF.VFX.confetti({ count: 100 });
          app.go("main");
        };

        body.replaceChildren(
          h("div", { class: "screen-head" }, h("div", { class: "display h1" }, "مين اللاعبين؟"), h("p", { class: "muted", style: { fontWeight: 700 } }, "اختار اسم وستيكر لكل واحد")),
          h("div", { class: "scroll" }, rows),
          h("div", { class: "dock" },
            button("يلا نبدأ!", { cls: "btn-lg btn-block green", icon: "play", onClick: start }),
            button("رجوع", { cls: "ghost btn-sm", onClick: () => { renderCount(); }, sfx: "click" })));
      }

      /* ---------- اختيار الأفاتار (بدون تكرار) ---------- */
      function openAvatarPicker(idx, done) {
        const takenByOthers = specs.filter((_, i) => i !== idx).map((s) => s.avatarId);
        const grid = h("div", { class: "avatar-grid" });
        let layer;
        avatars.forEach((a) => {
          const cell = h("button", { type: "button", class: "av-cell" + (a.id === specs[idx].avatarId ? " sel" : "") + (takenByOthers.includes(a.id) ? " taken" : ""), "aria-label": a.label });
          cell.append(avatar(a.id), h("div", { class: "lbl" }, a.label));
          cell.addEventListener("click", () => { specs[idx].avatarId = a.id; done(); KF.Haptics.buzz("select"); close(layer); });
          grid.append(cell);
        });
        layer = sheet({ title: "اختار الستيكر", content: grid });
      }

      renderCount();
      return {
        onBack() { if (step === 2) { renderCount(); return true; } return false; },
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
