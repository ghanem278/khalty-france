/* Storage — localStorage آمن (لو المتصفح مانع التخزين بيشتغل من الذاكرة من غير ما يكسر) */
(function (root) {
  const KF = (root.KF = root.KF || {});
  const mem = {};
  let ok = null;
  function available() {
    if (ok !== null) return ok;
    try { const k = "__kf_t"; root.localStorage.setItem(k, "1"); root.localStorage.removeItem(k); ok = true; }
    catch (e) { ok = false; }
    return ok;
  }
  const Storage = {
    get(key, fallback = null) {
      try {
        const raw = available() ? root.localStorage.getItem(key) : mem[key];
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try {
        const raw = JSON.stringify(value);
        if (available()) root.localStorage.setItem(key, raw); else mem[key] = raw;
        return true;
      } catch (e) { return false; }
    },
    remove(key) {
      try { if (available()) root.localStorage.removeItem(key); delete mem[key]; } catch (e) {}
    },
  };
  KF.Storage = Storage;
  if (typeof module !== "undefined") module.exports = Storage;
})(typeof window !== "undefined" ? window : globalThis);
