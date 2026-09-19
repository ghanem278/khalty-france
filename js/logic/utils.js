/* أدوات عامة بدون أي اعتماد على المتصفح */
(function (root) {
  const KF = (root.KF = root.KF || {});

  const rng = {
    /* عشوائي 0..1. لو عايز نتايج ثابتة للاختبار مرّر seed */
    make(seed) {
      if (seed == null) return Math.random;
      let a = seed >>> 0;
      return function () {           // mulberry32
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
  };

  function shuffle(arr, r = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* اختيار عنصر بوزن. items: [{item, w}] — بيرجع العنصر */
  function weightedPick(entries, r = Math.random) {
    const total = entries.reduce((s, e) => s + Math.max(0, e.w), 0);
    if (total <= 0) return entries.length ? entries[Math.floor(r() * entries.length)].item : null;
    let x = r() * total;
    for (const e of entries) {
      x -= Math.max(0, e.w);
      if (x <= 0) return e.item;
    }
    return entries[entries.length - 1].item;
  }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function uid(prefix = "id") { return prefix + "_" + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* تطبيع النص العربي للمقارنة (تشكيل/ألف/ياء/تاء مربوطة/مسافات) */
  function normalizeArabic(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, "")      // تشكيل + تطويل
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/وراء/g, "ورا")
      .replace(/[^\u0621-\u064Aa-z0-9\s]/g, " ")        // شيل الرموز
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  KF.utils = { rng, shuffle, weightedPick, clamp, uid, clone, normalizeArabic, levenshtein };
  if (typeof module !== "undefined") module.exports = KF.utils;
})(typeof window !== "undefined" ? window : globalThis);
