/* Challenge Logic — بناء القائمة + اختيار عشوائي ذكي (من غير تكرار ولا نفس الفئة ورا بعض) */
(function (root) {
  const KF = (root.KF = root.KF || {});

  /* بيكمّل الحقول الناقصة. نص التحدي بيفضل زي ما هو بالظبط */
  function normalize(raw, index) {
    const t = typeof raw === "string" ? { text: raw } : raw || {};
    const text = String(t.text == null ? "" : t.text);
    if (!text.trim()) return null;
    return {
      id: t.id || "c_auto_" + (index + 1),
      text,
      category: t.category || "random",
      points: Number.isFinite(t.points) ? t.points : KF.CONFIG.points.challenge,
      duration: Number.isFinite(t.duration) ? t.duration : 0,
      difficulty: t.difficulty || 1,
      type: t.type || "normal",
      flags: Array.isArray(t.flags) ? t.flags.slice() : [],
    };
  }

  function buildList(rawList) {
    const seen = new Set();
    const out = [];
    (rawList || []).forEach((r, i) => {
      const c = normalize(r, i);
      if (!c) return;
      let id = c.id, n = 2;
      while (seen.has(id)) id = c.id + "_" + n++;
      c.id = id; seen.add(id);
      out.push(c);
    });
    return out;
  }

  function isAllowed(c, settings) {
    if (!settings) return true;
    if (c.flags.includes("belt") && settings.enableBelt === false) return false;
    if (c.flags.includes("spicy") && settings.enableSpicy === false) return false;
    return true;
  }

  /* بيرجع تحدي أو null لو مفيش تحديات متاحة.
     state: {usedChallengeIds:[], recentCategories:[]} */
  function pick(list, state, settings, rng = Math.random, extraExclude = []) {
    const used = new Set(state.usedChallengeIds || []);
    extraExclude.forEach((i) => used.add(i));
    const avail = list.filter((c) => !used.has(c.id) && isAllowed(c, settings));
    if (!avail.length) return null;
    const recent = state.recentCategories || [];
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];
    return KF.utils.weightedPick(
      avail.map((c) => {
        let w = 1;
        if (c.category === last) w *= 0.15;
        else if (c.category === prev) w *= 0.6;
        return { item: c, w };
      }),
      rng
    );
  }

  function remaining(list, state, settings) {
    const used = new Set(state.usedChallengeIds || []);
    return list.filter((c) => !used.has(c.id) && isAllowed(c, settings)).length;
  }

  KF.Challenges = { normalize, buildList, pick, remaining, isAllowed };
  if (typeof module !== "undefined") module.exports = KF.Challenges;
})(typeof window !== "undefined" ? window : globalThis);
