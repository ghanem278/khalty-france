/* Score Logic + Golden Card Logic */
(function (root) {
  const KF = (root.KF = root.KF || {});

  function pointsForChallenge(challenge) {
    return challenge && Number.isFinite(challenge.points) ? challenge.points : KF.CONFIG.points.challenge;
  }
  function escapeById(id, escapes) { return (escapes || KF.DATA.escapes).find((e) => e.id === id) || null; }

  function addPoints(player, pts) { player.score += pts; return player.score; }

  /* ترتيب بالنقاط (تعادل = نفس المركز) */
  function ranking(players) {
    const sorted = players.slice().sort((a, b) => b.score - a.score || b.challengesDone - a.challengesDone || a.id.localeCompare(b.id, undefined, { numeric: true }));
    let rank = 0, prevScore = null, i = 0;
    return sorted.map((p) => {
      i++;
      if (p.score !== prevScore) { rank = i; prevScore = p.score; }
      return { player: p, rank };
    });
  }

  const Golden = {
    canUse(player) { return !!player && player.goldenCardAvailable === true; },
    consume(player) {
      if (!Golden.canUse(player)) return false;
      player.goldenCardAvailable = false;
      return true;
    },
  };

  KF.Scoring = { pointsForChallenge, escapeById, addPoints, ranking };
  KF.Golden = Golden;
  if (typeof module !== "undefined") module.exports = KF.Scoring;
})(typeof window !== "undefined" ? window : globalThis);
