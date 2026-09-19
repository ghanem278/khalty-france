/* Roulette Logic — اختيار عادل + ترتيب العجلة
   القاعدة: اللاعب اللي أكمل دوره (turnsCompleted فوق الأقل) مش بيطلع تاني قبل ما الباقي يكمّلوا.
   لو فضل لاعب واحد بس ما كملش دوره → بيتجوّز بـ"ضيف" من اللي كملوا (أقلهم أدوارًا وأبعدهم ظهورًا). */
(function (root) {
  const KF = (root.KF = root.KF || {});
  const U = () => KF.utils;

  function pairKey(a, b) { return [a, b].sort().join("|"); }

  function weightFor(p, ctx, cfg) {
    let w = 1;
    const sinceLast = ctx.spinIndex - p.lastAppearedSpin;
    if (p.lastAppearedSpin >= 0 && ctx.lastPair && ctx.lastPair.includes(p.id)) w *= cfg.recentPenalty;
    else if (p.lastAppearedSpin >= 0) w += Math.min(cfg.idleBoostMax, Math.max(0, sinceLast - 1) * cfg.idleBoostPerSpin);
    else w += cfg.idleBoostMax * 0.5; // لسه ما ظهرش خالص
    return w;
  }

  /* players: مصفوفة اللاعبين. ctx: {spinIndex, lastPair, pairCounts}. بيرجع {ids:[a,b], guestId} */
  function pickPair(players, ctx, rng = Math.random, cfg = KF.CONFIG.fairness) {
    if (players.length < 2) throw new Error("محتاج لاعبين اتنين على الأقل");
    const min = KF.Players.minTurns(players);
    const eligible = players.filter((p) => p.turnsCompleted === min);
    const others = players.filter((p) => p.turnsCompleted !== min);
    ctx = ctx || {};
    ctx.pairCounts = ctx.pairCounts || {};
    const pairCount = (a, b) => ctx.pairCounts[pairKey(a, b)] || 0;

    let first, second, guestId = null;

    if (eligible.length >= 2) {
      first = U().weightedPick(eligible.map((p) => ({ item: p, w: weightFor(p, ctx, cfg) })), rng);
      const rest = eligible.filter((p) => p !== first);
      second = U().weightedPick(
        rest.map((p) => ({ item: p, w: weightFor(p, ctx, cfg) / (1 + cfg.pairRepeatPenalty * pairCount(first.id, p.id)) })),
        rng
      );
    } else {
      // لاعب واحد فاضل → ضيف من اللي كمّلوا
      first = eligible[0];
      // الضيف: اللي "متقدّم" أقل حاجة (أقل أدوار مكتملة)، ولو الضيف خسر بياخد تحدي زيادة بيتحسب للدورة الجاية.
      // كل ما الضيف كان أقل أدوارًا وأقل خسارة قريبة، كل ما فرصته أعلى.
      const lowest = Math.min(...others.map((p) => p.turnsCompleted));
      const pool = others.filter((p) => p.turnsCompleted === lowest);
      second = U().weightedPick(
        pool.map((p) => {
          let w = weightFor(p, ctx, cfg) / (1 + cfg.pairRepeatPenalty * pairCount(first.id, p.id));
          w /= 1 + 0.9 * (p.rpsLosses || 0) / Math.max(1, (p.timesAppeared || 1));  // اللي بيخسر كتير في العادة يتحمي شوية
          return { item: p, w };
        }),
        rng
      );
      guestId = second.id;
    }
    const ids = U().shuffle([first.id, second.id], rng);
    return { ids, guestId };
  }

  /* ترتيب العجلة: بيضمن إن الاتنين المختارين قدام السهمين (عكس بعض)
     M = عدد القطع. لو عدد اللاعبين زوجي M=N وإلا M=2N (كل لاعب مرتين).
     بيرجع { slots:[playerId...], top:slotIndex, bottom:slotIndex, M } */
  function buildLayout(playerIds, [x, y], rng = Math.random) {
    const N = playerIds.length;
    const others = U().shuffle(playerIds.filter((id) => id !== x && id !== y), rng);
    let slots;
    if (N % 2 === 0) {
      const M = N, half = M / 2;
      slots = new Array(M);
      slots[0] = x; slots[half] = y;
      let k = 0;
      for (let i = 0; i < M; i++) if (slots[i] === undefined) slots[i] = others[k++];
    } else {
      // دورة عشوائية: x ثم y ثم الباقي. القطعة i وعكسها (i+N) = لاعبين متتاليين في الدورة
      const cyc = [x, y, ...others];
      slots = [];
      for (let i = 0; i < N; i++) slots[i] = cyc[i];
      for (let i = 0; i < N; i++) slots[i + N] = cyc[(i + 1) % N];
    }
    const M = slots.length;
    // الزوج المضمون دايمًا عند القطعة 0 وعكسها (M/2). نلف الترتيب عشوائيًا مع تتبع مكانه
    // (مهم: في العدد الفردي كل لاعب ظاهر مرتين، فمينفعش نبحث عنه بـindexOf بعد اللف)
    const rot = Math.floor(rng() * M);
    slots = slots.slice(rot).concat(slots.slice(0, rot));
    const ix = (M - rot) % M;             // مكان القطعة 0 الأصلية بعد اللف
    const opp = (ix + M / 2) % M;
    if (!((slots[ix] === x && slots[opp] === y))) throw new Error("layout invariant broken");
    const swap = rng() < 0.5;             // مين فوق ومين تحت
    return { slots, M, top: swap ? ix : opp, bottom: swap ? opp : ix };
  }

  /* زاوية اللف النهائية (بالدرجات، مع عقارب الساعة) بحيث القطعة top تقف تحت السهم العلوي.
     currentAngle: الزاوية الحالية. turns: لفات كاملة. jitter 0..0.5 */
  function landingAngle(layout, currentAngle, turns, rng = Math.random, jitter = 0.28) {
    const seg = 360 / layout.M;
    const j = 0.5 + (rng() * 2 - 1) * jitter;         // مكان الوقوف جوه القطعة
    const target = (((-(layout.top + j) * seg) % 360) + 360) % 360;
    const cur = ((currentAngle % 360) + 360) % 360;
    let delta = target - cur;
    if (delta < 0) delta += 360;
    return currentAngle + turns * 360 + delta;
  }

  /* أي قطعة تحت السهم العلوي عند زاوية معينة؟ (للتحقق وللتكّات) */
  function slotAtTop(angle, M) {
    const seg = 360 / M;
    const phi = (((-angle) % 360) + 360) % 360;
    return Math.floor(phi / seg) % M;
  }

  KF.Roulette = { pickPair, buildLayout, landingAngle, slotAtTop, pairKey };
  if (typeof module !== "undefined") module.exports = KF.Roulette;
})(typeof window !== "undefined" ? window : globalThis);
