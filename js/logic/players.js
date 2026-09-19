/* Player Logic — بيانات كل لاعب منفصلة، والمنطق بيشتغل بالـ ID مش بالاسم */
(function (root) {
  const KF = (root.KF = root.KF || {});

  function createPlayer({ id, name, avatarId }) {
    return {
      id,
      name,
      avatarId,
      score: 0,
      goldenCardAvailable: true,
      hasCompletedCurrentRound: false,
      hasReceivedChallenge: false,
      hasSuccessfullyCompletedChallenge: false,
      status: "idle", // idle | selected | rps | challenged | completed
      turnsCompleted: 0,   // عدد المرات اللي أكمل فيها دوره (تحدي أو نقاط هروب)
      challengesDone: 0,
      escapesUsed: 0,
      timesAppeared: 0,
      lastAppearedSpin: -1,
      rpsWins: 0,
      rpsLosses: 0,
    };
  }

  /* أقل عدد أدوار مكتملة = الدورة الحالية. اللي فوقها "أكمل الدورة" */
  function minTurns(players) {
    return players.length ? Math.min(...players.map((p) => p.turnsCompleted)) : 0;
  }

  function refreshRoundFlags(players) {
    const m = minTurns(players);
    players.forEach((p) => { p.hasCompletedCurrentRound = p.turnsCompleted > m; });
    return m;
  }

  /* تنظيف الأسماء: فراغات، فاضي، طويل، مكرر */
  function sanitizeNames(rawNames, { maxLength = 14 } = {}) {
    const seen = new Map();
    const notes = [];
    const out = rawNames.map((raw, i) => {
      let n = String(raw == null ? "" : raw)
        .replace(/[\u0000-\u001f\u007f<>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
        .trim();
      if (!n) { n = "لاعب " + (i + 1); notes.push({ index: i, kind: "empty" }); }
      const key = n.toLowerCase();
      const count = (seen.get(key) || 0) + 1;
      seen.set(key, count);
      if (count > 1) {
        let cand = `${n} ${count}`;
        while (seen.has(cand.toLowerCase())) cand += "٠";
        seen.set(cand.toLowerCase(), 1);
        notes.push({ index: i, kind: "duplicate", from: n, to: cand });
        n = cand;
      }
      return n;
    });
    return { names: out, notes };
  }

  function buildPlayers(specs, opts) {
    const { names } = sanitizeNames(specs.map((s) => s.name), opts);
    return specs.map((s, i) =>
      createPlayer({ id: "p" + (i + 1), name: names[i], avatarId: s.avatarId })
    );
  }

  KF.Players = { createPlayer, minTurns, refreshRoundFlags, sanitizeNames, buildPlayers };
  if (typeof module !== "undefined") module.exports = KF.Players;
})(typeof window !== "undefined" ? window : globalThis);
