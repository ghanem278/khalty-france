/* اختبار المتصفح الكامل (بيلعب اللعبة فعليًا بالضغط على الأزرار).
   التشغيل:   npm i -D playwright && npx playwright install chromium && node tests/e2e.js
   (لو عندك كروم مثبّت: CHROME_PATH=/path/to/chrome node tests/e2e.js) */
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".mp3": "audio/mpeg" };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});

srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, locale: "ar-EG" });
  const page = await ctx.newPage(); const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const click = (t) => page.getByRole("button", { name: t }).first().click({ force: true });
  const waitScreen = (s) => page.waitForFunction((s) => document.querySelector(".screen:not(.leave)")?.dataset.screen === s, s, { timeout: 20000 });
  let ok = true; const check = (name, cond) => { console.log((cond ? "  ✓ " : "  ✗ ") + name); if (!cond) ok = false; };
  try {
    await page.goto(url); await page.waitForTimeout(1300);
    await click("اضغط للبدء"); await waitScreen("terms"); await click("التالي"); await waitScreen("password");
    await page.fill("input.field", "غلط"); await click("افتح"); check("باسورد غلط ما يفتحش", (await page.locator(".pw-caption").count()) === 0);
    await page.fill("input.field", "يوم ورا يوم"); await click("افتح"); await waitScreen("setup"); check("الباسورد الصح بيفتح", true);
    await page.getByRole("button", { name: "4 لاعبين" }).click({ force: true }); await click("التالي"); await page.waitForTimeout(600);
    const f = page.locator("input.field"); for (let i = 0; i < 4; i++) await f.nth(i).fill(["أحمد", "منى", "سعد", "علا"][i]);
    await click("يلا نبدأ"); await waitScreen("main");
    await page.evaluate(() => { KF.CONFIG.wheel.spinMs = [700, 800]; KF.CONFIG.rps.countdownSteps = 1; });
    for (const how of ["complete", "pay"]) {
      await click("لفّ العجلة"); await page.waitForSelector(".pair-overlay", { timeout: 20000 });
      const ok1 = await page.evaluate(() => { const g = KF.App.game, L = g.state.pair.layout, a = parseFloat(/rotate\(([-\d.]+)deg\)/.exec(document.querySelector(".wheel-zone canvas").style.transform)[1]); const t = L.slots[KF.Roulette.slotAtTop(a, L.M)], b = L.slots[KF.Roulette.slotAtTop(a + 180, L.M)]; return g.state.pair.ids.includes(t) && g.state.pair.ids.includes(b) && t !== b; });
      check("العجلة وقفت على الاتنين المختارين تحت السهمين", ok1);
      await click("يلا حجر ورقة مقص"); await waitScreen("rps"); await page.waitForTimeout(500);
      const pick = async (i) => { await page.locator(".rps-card").nth(i).click({ force: true }); await click("ثبّت اختيارك"); };
      await pick(0); await click("جاهز"); await page.waitForTimeout(400); await pick(1);
      await page.waitForSelector(".result-banner:has-text('كسب')", { timeout: 10000 }); await click("كمّل"); await waitScreen("challenge");
      if (how === "complete") await click("تم"); else { await click("هروب"); await page.waitForTimeout(600); await page.locator(".esc-card").nth(0).click({ force: true }); await page.waitForTimeout(400); await page.getByRole("button", { name: /^تم ✅/ }).click({ force: true }); }
      await waitScreen("main"); await page.waitForTimeout(500);
    }
    const st = await page.evaluate(() => ({ scores: KF.App.game.players.map((p) => p.score).sort((a, b) => a - b), pool: KF.App.game.state.prizePool }));
    check("النقاط صح (5 للتحدي + 3 للهروب) والصندوق 5", st.scores.join() === "0,0,3,5" && st.pool === 5);
    await page.reload(); await page.waitForTimeout(1300); await click("كمّل الجيم اللي فات"); await waitScreen("main");
    check("الريفرش بيرجّع نفس الجيم", (await page.locator("#pool-val").innerText()) === "5");
  } catch (e) { console.error("E2E FAIL:", e.message.split("\n")[0]); ok = false; }
  check("مفيش أخطاء JavaScript", errs.length === 0); if (errs.length) console.error(errs.join("\n"));
  await browser.close(); srv.close(); process.exit(ok ? 0 : 1);
});
