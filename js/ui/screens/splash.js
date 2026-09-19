/* Splash — الشاشة الأولى: اللوجو + الاسم + ابدأ (بتفتح الصوت كمان) */
(function (root) {
  const KF = root.KF, { h, button } = KF.UI, C = KF.CONFIG;

  KF.App.register("splash", {
    meta: { chrome: "minimal" },
    mount(el, params, app) {
      el.classList.add("splash");
      KF.Audio.startMusic();

      const stickers = h("div", { class: "sticker-field", "aria-hidden": "true" });
      const spots = [["🎤", 6, 10], ["😂", 78, 7], ["🃏", 88, 40], ["💸", 4, 46], ["🔥", 14, 78], ["🎡", 80, 80], ["🥔", 46, 92], ["🤪", 52, 3]];
      spots.forEach(([e, x, y], i) => stickers.append(h("div", { class: "sticker", style: { insetInlineStart: x + "%", top: y + "%", "--r": (i % 2 ? 9 : -9) + "deg", animationDelay: -i * 0.7 + "s", fontSize: 34 + (i % 3) * 8 + "px" } }, e)));

      const logo = h("div", { class: "logo-badge" });
      const img = h("img", { src: "assets/logo.svg", alt: "لوجو خالتي فرنسا", draggable: "false" });
      img.addEventListener("error", () => { logo.replaceChildren(h("div", { style: { fontSize: "120px", textAlign: "center" } }, "👵")); });
      logo.append(img);

      const title = h("div", { class: "title-lockup" },
        h("div", { class: "poster" }, C.game.name),
        h("div", { class: "ribbon" }, C.game.tagline));

      const cta = h("div", { class: "cta-zone" });
      if (app.savedGame) {
        const sg = app.savedGame;
        cta.append(
          button("كمّل الجيم اللي فات", { cls: "green btn-lg btn-block pulse-cta", icon: "play", onClick: () => app.resumeGame() }),
          h("div", { class: "chip yellow", style: { alignSelf: "center" } }, `${sg.players.length} لاعبين • الدورة ${sg.round}`),
          button("جيم جديد", { cls: "paper btn-block", onClick: async () => {
            const ok = await KF.UI.dialog({ emoji: "🆕", title: "جيم جديد؟", text: "الجيم القديم هيتمسح.", buttons: [{ label: "أيوه", cls: "primary", value: true }, { label: "لأ", cls: "ghost", value: false }] });
            if (ok) { app.savedGame = null; app.clearSession(); app.next(); }
          } }));
      } else {
        cta.append(button("اضغط للبدء", { cls: "btn-lg btn-block pulse-cta", icon: "play", onClick: () => app.next() }));
      }
      const credit = h("div", { class: "credit-line muted" }, C.game.credit);
      el.append(stickers, logo, title, cta, credit);
      return {};
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
