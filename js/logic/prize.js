/* Prize Pool Logic
   الجايزة بتتوزع على أعلى نقاط. لو حصل تعادل بيتقسموا بالحصص.
   اللي معاه أعلى نقاط ومستخدمش الجولدن كارد بيتحسب بحصتين (كأنه فردين). */
(function (root) {
  const KF = (root.KF = root.KF || {});

  function round2(n) { return Math.round(n * 100) / 100; }

  function compute(players, pool, multiplier = KF.CONFIG.prize.noGoldenMultiplier) {
    const res = { pool, topScore: 0, winners: [], totalShares: 0, noWinner: false, steps: [] };
    if (!players.length) { res.noWinner = true; return res; }
    const top = Math.max(...players.map((p) => p.score));
    res.topScore = top;
    if (top <= 0) {
      res.noWinner = true;
      res.steps.push("محدش خد نقاط، فمفيش فايز.");
      return res;
    }
    const tops = players.filter((p) => p.score === top);
    tops.forEach((p) => {
      const doubled = p.goldenCardAvailable === true;   // لسه معاه الكارت = ما استخدمهاش
      res.winners.push({ id: p.id, name: p.name, score: p.score, doubled, shares: doubled ? multiplier : 1, amount: 0 });
    });
    res.totalShares = res.winners.reduce((s, w) => s + w.shares, 0);
    res.winners.forEach((w) => { w.amount = round2((pool * w.shares) / res.totalShares); });

    res.steps.push(`الصندوق: ${pool}`);
    res.steps.push(tops.length === 1 ? `أعلى نقاط: ${tops[0].name} (${top})` : `تعادل في أعلى نقاط (${top}): ${tops.map((p) => p.name).join("، ")}`);
    res.winners.forEach((w) =>
      res.steps.push(w.doubled
        ? `${w.name} ما استخدمش الجولدن كارد ← بيتحسب كأنه فردين (${w.shares} حصة)`
        : `${w.name} استخدم الجولدن كارد ← حصة واحدة`)
    );
    res.steps.push(`إجمالي الحصص: ${res.totalShares}`);
    return res;
  }

  KF.Prize = { compute, round2 };
  if (typeof module !== "undefined") module.exports = KF.Prize;
})(typeof window !== "undefined" ? window : globalThis);
