/* Boot — تشغيل اللعبة بعد ما الخطوط تجهز + تسجيل الـService Worker (للأوفلاين) */
(function (root) {
  const KF = root.KF;
  function start() { try { KF.App.init(); } catch (e) { console.error(e); const b = document.getElementById("boot"); if (b) b.textContent = "حصلت مشكلة في التحميل — جرّب تعمل ريفرش"; } }
  const ready = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
  ready.then(start);

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW:", e.message)); });
  }
})(window);
