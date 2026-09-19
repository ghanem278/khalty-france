/* Terms — شروط اللعبة. المحتوى من data/terms.js */
(function (root) {
  const KF = root.KF, { h, button } = KF.UI;

  KF.App.register("terms", {
    meta: { chrome: "minimal" },
    mount(el, params, app) {
      const T = KF.DATA.terms;
      const list = h("div", { class: "terms-list" });
      T.items.forEach((it, i) => list.append(h("div", { class: "card term-card " + (i % 2 ? "tilt-r" : "tilt-l"), style: { animationDelay: 80 + i * 70 + "ms" } },
        h("div", { class: "t-ico" }, it.icon || "•"), h("p", null, it.text))));
      el.append(
        h("div", { class: "screen-head" }, h("div", { class: "display h1" }, T.title)),
        h("div", { class: "scroll" }, list),
        h("div", { class: "dock" },
          button("التالي", { cls: "btn-lg btn-block", onClick: () => app.next() }),
          button("رجوع", { cls: "ghost btn-sm", onClick: () => app.prev(), sfx: "click" })));
      return {};
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
