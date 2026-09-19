/* Service Worker — بيخلي اللعبة تشتغل أوفلاين.
   لما تعدّل أي ملف: غيّر رقم VERSION تحت عشان المتصفح يحمّل النسخة الجديدة. */
const VERSION = "kf-v1.0.0";

const CORE = [
  "./", "index.html", "manifest.webmanifest",
  "css/theme.css", "css/base.css", "css/screens.css",
  "fonts/lalezar-arabic-400-normal.woff2", "fonts/lalezar-latin-400-normal.woff2",
  "fonts/baloo-bhaijaan-2-arabic-400-normal.woff2", "fonts/baloo-bhaijaan-2-arabic-700-normal.woff2", "fonts/baloo-bhaijaan-2-arabic-800-normal.woff2",
  "fonts/baloo-bhaijaan-2-latin-400-normal.woff2", "fonts/baloo-bhaijaan-2-latin-700-normal.woff2",
  "assets/logo.svg", "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-maskable-512.png",
  "js/config.js", "data/challenges.js", "data/avatars.js", "data/escapes.js", "data/terms.js",
  "js/logic/utils.js", "js/logic/players.js", "js/logic/roulette.js", "js/logic/rps.js", "js/logic/challenges.js", "js/logic/scoring.js", "js/logic/prize.js", "js/logic/game.js",
  "js/systems/storage.js", "js/systems/haptics.js", "js/systems/speech.js", "js/systems/audio.js", "js/systems/vfx.js",
  "js/ui/components.js", "js/ui/app.js",
  "js/ui/screens/splash.js", "js/ui/screens/terms.js", "js/ui/screens/password.js", "js/ui/screens/setup.js", "js/ui/screens/main.js", "js/ui/screens/rps.js", "js/ui/screens/challenge.js", "js/ui/screens/results.js",
  "js/boot.js",
];

/* الأصوات اختيارية: بنقرا المسارات من config.js عشان مفيش قايمة ثانية نصيّنها */
function optionalAudioUrls() {
  try {
    importScripts("js/config.js");
    const a = self.KF.CONFIG.audio, out = [];
    ["music", "sfx", "voices"].forEach((g) => Object.values(a[g] || {}).forEach((u) => out.push(u)));
    return out;
  } catch (e) { return []; }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    // ملفات الصوت: لو ملف مش موجود بنتجاهله (مش بيوقّف التثبيت)
    await Promise.all(optionalAudioUrls().map((u) => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok && /\.(mp3|ogg|wav|m4a|webp|png|jpg|svg)$/i.test(url.pathname)) cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === "navigate") return (await cache.match("index.html")) || Response.error();
      return Response.error();     // ملف صوت ناقص = خطأ عادي (اللعبة بتستخدم بديل)
    }
  })());
});
