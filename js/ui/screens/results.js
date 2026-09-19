/* Results — النتيجة النهائية + الجايزة (بشرح الحساب) */
(function (root) {
  const KF = root.KF, { h, button, avatar, icon, wait } = KF.UI, C = KF.CONFIG;
  const money = (n) => (Math.round(n * 100) / 100).toString().replace(/\.0+$/, "") + " " + C.money.currency;

  KF.App.register("results", {
    meta: { chrome: "none" },
    mount(el, params, app) {
      const g = app.game;
      if (!g) { app.go("splash"); return {}; }
      el.classList.add("res-screen");
      const res = g.results();
      const ranked = res.ranking;
      const prize = res.prize;
      const amountFor = (id) => { const w = prize.winners.find((x) => x.id === id); return w ? w.amount : 0; };

      /* بوديوم: أول 3 مراكز حسب النقاط. الارتفاع حسب المركز (التعادل = نفس الارتفاع)، والترتيب على الشاشة: التاني - الأول - التالت */
      const top = ranked.filter((r) => r.player.score > 0 && r.rank <= 3).slice(0, 4);
      const podium = h("div", { class: "podium" });
      const byRank = { 1: top.filter((r) => r.rank === 1), 2: top.filter((r) => r.rank === 2), 3: top.filter((r) => r.rank === 3) };
      const visual = [...byRank[2], ...byRank[1], ...byRank[3]];
      visual.forEach((r, i) => {
        const place = r.rank === 1 ? "p1" : r.rank === 2 ? "p2" : "p3";
        podium.append(h("div", { class: "pod " + place, style: { animationDelay: 250 + i * 140 + "ms" } },
          r.rank === 1 ? h("div", { style: { fontSize: "36px", lineHeight: 1 } }, "👑") : null,
          avatar(r.player.avatarId, r.rank === 1 ? "lg" : ""),
          h("div", { class: "nm" }, r.player.name),
          h("div", { class: "blk" }, String(r.player.score))));
      });

      const list = h("div", { class: "sb-list" });
      ranked.forEach(({ player: p, rank }) => {
        const amt = amountFor(p.id);
        list.append(h("div", { class: "sb-row" + (rank === 1 && p.score > 0 ? " first" : "") },
          h("div", { class: "rk" }, rank === 1 && p.score > 0 ? "🥇" : rank === 2 && p.score > 0 ? "🥈" : rank === 3 && p.score > 0 ? "🥉" : "#" + rank),
          avatar(p.avatarId, "sm"),
          h("div", { class: "grow" }, h("div", { class: "nm" }, p.name),
            h("div", { class: "sub" }, h("span", null, `✅ ${p.challengesDone} تحدي`), h("span", null, `🆘 ${p.escapesUsed} هروب`), h("span", null, p.goldenCardAvailable ? "🃏 معاه" : "🃏 استخدمها")),
            amt > 0 ? h("div", { class: "win-money" }, "💰 " + money(amt)) : null),
          h("div", { class: "sc" }, h("span", null, String(p.score)), h("small", null, "نقطة"))));
      });

      /* بطاقة حساب الجايزة */
      const calc = h("div", { class: "calc-box" }, h("h3", null, "💰 توزيع الجايزة"));
      if (prize.pool <= 0) calc.append(h("p", { style: { fontWeight: 700 } }, "الصندوق فاضي — محدش دفع ٥ جنيه، فمفيش فلوس تتوزع. 😄"));
      else if (prize.noWinner) calc.append(h("p", { style: { fontWeight: 700 } }, `الصندوق ${money(prize.pool)} — بس محدش خد نقاط، فمفيش فايز.`));
      else {
        const ul = h("ul");
        prize.steps.forEach((s) => ul.append(h("li", null, s)));
        prize.winners.forEach((w) => ul.append(h("li", { style: { color: "#1c8a30" } }, `${w.name} ياخد ${money(prize.pool)} × ${w.shares}/${prize.totalShares} = ${money(w.amount)}`)));
        calc.append(ul);
      }

      const hero = prize.winners.length && prize.pool > 0
        ? h("div", { class: "pool-banner" }, icon("coin"), h("span", null, prize.winners.length === 1 ? `${prize.winners[0].name} كسب ${money(prize.winners[0].amount)}` : `الصندوق ${money(prize.pool)} اتقسم`))
        : h("div", { class: "pool-banner", style: { background: "linear-gradient(180deg,#8f86c8,#5d54a0)" } }, icon("coin"), h("span", null, `الصندوق: ${money(prize.pool)}`));
      hero.querySelector("svg").style.cssText = "width:34px;height:34px";

      const winnerNames = ranked.filter((r) => r.rank === 1 && r.player.score > 0).map((r) => r.player.name);
      const headline = winnerNames.length
        ? h("div", { class: "screen-head" }, h("div", { class: "display h1" }, winnerNames.length === 1 ? "🏆 الكسبان" : "🏆 الكسبانين"), h("div", { class: "poster", style: { fontSize: "clamp(34px, 11vw, 56px)", marginTop: "6px" } }, winnerNames.join(" و ")))
        : h("div", { class: "screen-head" }, h("div", { class: "display h1" }, "خلصت اللعبة"), h("p", { class: "muted", style: { fontWeight: 700 } }, "محدش خد نقاط.. غريبة! 😅"));

      el.append(headline,
        h("div", { class: "scroll" }, h("div", { class: "stack" }, podium, hero, list, calc)),
        h("div", { class: "dock" },
          button("العب تاني بنفس اللاعبين", { cls: "btn-lg btn-block green", icon: "refresh", onClick: () => {
            app.game = KF.Game.rematch(g); app.lastScoreSnapshot = {}; app.saveSession(); app.go("main");
          } }),
          button("رجوع للبداية", { cls: "paper btn-block", icon: "home", onClick: () => { app.game = null; app.clearSession(); app.go("splash"); } })));

      // احتفال
      KF.Audio.play("win"); KF.Haptics.buzz("win");
      root.setTimeout(() => { KF.VFX.rain(2600); KF.VFX.confetti({ count: 140 }); }, 350);
      return {};
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
