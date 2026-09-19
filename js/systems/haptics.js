/* Haptics — اهتزاز لو الجهاز يدعم وفي الإعدادات مفعّل */
(function (root) {
  const KF = (root.KF = root.KF || {});
  const patterns = {
    tap: 8, press: 14, tick: 5, select: [20, 40, 20], success: [30, 40, 60], fail: [80, 50, 80],
    golden: [20, 30, 20, 30, 80], shake: [60, 40, 60, 40, 60], win: [40, 30, 40, 30, 120],
  };
  KF.Haptics = {
    enabled: true,
    buzz(name = "tap") {
      if (!this.enabled) return;
      try { if (root.navigator && typeof root.navigator.vibrate === "function") root.navigator.vibrate(patterns[name] || patterns.tap); } catch (e) {}
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
