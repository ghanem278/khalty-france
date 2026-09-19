/* اختبارات المنطق — شغّلها بـ:  node tests/logic.test.js  */
const assert = require("assert");
const path = require("path");
globalThis.KF = {};
const R = (p) => require(path.join(__dirname, "..", p));
["js/config.js", "data/avatars.js", "data/escapes.js", "data/challenges.js", "data/terms.js",
 "js/logic/utils.js", "js/logic/players.js", "js/logic/roulette.js", "js/logic/rps.js",
 "js/logic/challenges.js", "js/logic/scoring.js", "js/logic/prize.js", "js/logic/game.js"].forEach(R);

let passed = 0, failed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log("  ✓ " + name); }
  catch (e) { failed++; failures.push([name, e]); console.log("  ✗ " + name + "\n      " + e.message); }
}
const rng = KF.utils.rng.make;
const CH = KF.Challenges.buildList(KF.DATA.challenges);

function mkGame(n, seed = 1, opts = {}) {
  const specs = Array.from({ length: n }, (_, i) => ({ name: opts.names ? opts.names[i] : "P" + (i + 1), avatarId: "a" + String(i + 1).padStart(2, "0") }));
  return KF.Game.create({
    players: KF.Players.buildPlayers(specs),
    challenges: opts.challenges || CH,
    settings: Object.assign({}, KF.DEFAULT_SETTINGS, opts.settings),
    rng: rng(seed),
  });
}
/* بيلعب لفة كاملة: يرجع {pair, winnerId, loserId, ...}. loserFn بتحدد مين يخسر (اختياري) */
function playTurn(g, how = "complete", rpsBias = null) {
  const sp = g.spin(); assert.ok(sp.ok, "spin failed");
  g.startRps();
  const [a, b] = g.state.pair.ids;
  let r;
  do {
    const ca = rpsBias === "aLoses" ? "rock" : KF.utils.shuffle(KF.RPS.CHOICES, g.rng)[0];
    const cb = rpsBias === "aLoses" ? "paper" : KF.utils.shuffle(KF.RPS.CHOICES, g.rng)[0];
    r = g.submitRps(ca, cb);
  } while (r.result === "draw");
  const bc = g.beginChallenge();
  if (!bc.ok) return { pair: [a, b], noChallenge: true };
  let res;
  if (how === "complete") res = g.completeChallenge();
  else if (how === "skip") res = g.skipChallenge();
  else res = g.useEscape(how);
  return { pair: [a, b], guest: sp.pair.guestId, loserId: r.loserId, winnerId: r.winnerId, res };
}

console.log("\nRPS");
test("كل تركيبات حجر/ورقة/مقص صح", () => {
  const { resolve } = KF.RPS;
  assert.strictEqual(resolve("rock", "scissors"), "a");
  assert.strictEqual(resolve("scissors", "rock"), "b");
  assert.strictEqual(resolve("paper", "rock"), "a");
  assert.strictEqual(resolve("rock", "paper"), "b");
  assert.strictEqual(resolve("scissors", "paper"), "a");
  assert.strictEqual(resolve("paper", "scissors"), "b");
  for (const c of KF.RPS.CHOICES) assert.strictEqual(resolve(c, c), "draw");
});
test("اختيار غير صالح بيرمي خطأ (مش بيكسر بصمت)", () => {
  assert.throws(() => KF.RPS.resolve("lizard", "rock"));
});
test("التعادل بيتعاد ومفيش خسران لحد ما حد يكسب", () => {
  const g = mkGame(3);
  g.spin(); g.startRps();
  assert.strictEqual(g.submitRps("rock", "rock").result, "draw");
  assert.strictEqual(g.state.rps.loserId, null);
  assert.strictEqual(g.submitRps("rock", "paper").result, "decided");
  assert.ok(g.state.rps.loserId);
});

console.log("\nالنقاط والهروب");
test("تنفيذ التحدي = 5 نقاط ويكمّل الدور", () => {
  const g = mkGame(4);
  const t = playTurn(g, "complete");
  const p = g.player(t.loserId);
  assert.strictEqual(p.score, 5);
  assert.strictEqual(p.turnsCompleted, 1);
  assert.strictEqual(p.hasCompletedCurrentRound, true);
});
test("نقاط كل وسيلة هروب صح (بلانك4 / 5ج 3 / صراحة 2 / حزام 1)", () => {
  const exp = { plank: 4, pay: 3, truth: 2, belt: 1 };
  for (const [id, pts] of Object.entries(exp)) {
    const g = mkGame(3, 7);
    const t = playTurn(g, id);
    assert.strictEqual(g.player(t.loserId).score, pts, id);
    assert.strictEqual(g.player(t.loserId).turnsCompleted, 1, id + " must complete turn");
  }
});
test("اللاعب بياخد نقاط الخيار اللي اختاره فعلًا (مش نقاط التحدي)", () => {
  const g = mkGame(3);
  const t = playTurn(g, "truth");
  assert.strictEqual(g.player(t.loserId).score, 2);
});
test("دفع 5 جنيه بيزوّد الصندوق 5", () => {
  const g = mkGame(3);
  playTurn(g, "pay");
  assert.strictEqual(g.state.prizePool, 5);
  playTurn(g, "pay");
  assert.strictEqual(g.state.prizePool, 10);
});
test("وسائل هروب تانية ما بتلمسش الصندوق", () => {
  const g = mkGame(3);
  playTurn(g, "plank"); playTurn(g, "truth"); playTurn(g, "belt");
  assert.strictEqual(g.state.prizePool, 0);
});
test("نقاط تحدي مخصصة (points) بتتحسب", () => {
  const custom = KF.Challenges.buildList([{ text: "x", points: 8 }, { text: "y", points: 8 }, { text: "z", points: 8 }]);
  const g = mkGame(3, 2, { challenges: custom });
  const t = playTurn(g, "complete");
  assert.strictEqual(g.player(t.loserId).score, 8);
});
test("هروب مش مسموح خارج مرحلة التحدي", () => {
  const g = mkGame(3);
  assert.strictEqual(g.useEscape("pay").ok, false);
  assert.strictEqual(g.completeChallenge().ok, false);
});
test("useEscape('golden') مرفوض (الجولدن ليها دالة خاصة)", () => {
  const g = mkGame(3);
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  assert.strictEqual(g.useEscape("golden").ok, false);
});

console.log("\nالجولدن كارد");
test("بتغيّر التحدي، من غير نقاط، وبتتحرق", () => {
  const g = mkGame(4, 3);
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const p = g.challengePlayer, oldId = g.state.challenge.id;
  const r = g.useGolden();
  assert.ok(r.ok);
  assert.notStrictEqual(g.state.challenge.id, oldId);
  assert.strictEqual(p.score, 0);
  assert.strictEqual(p.goldenCardAvailable, false);
  assert.strictEqual(p.turnsCompleted, 0, "الجولدن ما بتكمّلش الدور");
  assert.strictEqual(g.phase, "challenge");
});
test("مينفعش تستخدمها مرتين", () => {
  const g = mkGame(4, 3);
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  assert.ok(g.useGolden().ok);
  const r2 = g.useGolden();
  assert.strictEqual(r2.ok, false); assert.strictEqual(r2.reason, "used");
});
test("بعد الجولدن يظهر تحدي جديد وينفع ينفذه أو يهرب", () => {
  const g = mkGame(4, 3);
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const pid = g.challengePlayer.id;
  g.useGolden();
  assert.ok(g.currentChallenge);
  const avail = g.availableEscapes().find((e) => e.id === "golden");
  assert.strictEqual(avail.disabled, true);
  assert.ok(g.completeChallenge().ok);
  assert.strictEqual(g.player(pid).score, 5);
});
test("التحدي القديم ما بيرجعش تاني في نفس الجيم", () => {
  const g = mkGame(4, 9);
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const old = g.state.challenge.id;
  g.useGolden();
  assert.ok(g.state.usedChallengeIds.includes(old));
});
test("لو مفيش بديل، الجولدن مبتتحرقش", () => {
  const one = KF.Challenges.buildList([{ text: "الوحيد" }]);
  const g = mkGame(3, 1, { challenges: one });
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const r = g.useGolden();
  assert.strictEqual(r.ok, false);
  assert.strictEqual(g.challengePlayer.goldenCardAvailable, true);
});

console.log("\nنظام الدور العادل");
test("الفايز في RPS ما ياخدش نقاط ويفضل متاح", () => {
  const g = mkGame(4, 5);
  const t = playTurn(g, "complete");
  const w = g.player(t.winnerId);
  assert.strictEqual(w.score, 0);
  assert.strictEqual(w.turnsCompleted, 0);
  assert.strictEqual(w.hasCompletedCurrentRound, false);
  assert.ok(w.rpsWins >= 1);
});
test("مثال المواصفات: A يكسب، B يخسر وينفذ → B مكتمل، A متاح ويجوز يطلع تاني", () => {
  const g = mkGame(4, 11);
  const t = playTurn(g, "complete");
  assert.strictEqual(g.player(t.loserId).hasCompletedCurrentRound, true);
  assert.strictEqual(g.player(t.winnerId).hasCompletedCurrentRound, false);
  // اللي كمّل مش هيطلع تاني طول ما فيه 2+ لاعبين لسه ما كملوش
  let appearedAgain = false;
  for (let i = 0; i < 40; i++) {
    const gg = mkGame(4, 100 + i);
    const tt = playTurn(gg, "complete");
    gg.spin();
    if (gg.state.pair.ids.includes(tt.loserId)) appearedAgain = true;
  }
  assert.strictEqual(appearedAgain, false, "اللي كمّل دوره ظهر تاني بدري");
});
test("اللاعب اللي كسب RPS ممكن يظهر تاني", () => {
  let winnerReappeared = false;
  for (let i = 0; i < 60 && !winnerReappeared; i++) {
    const g = mkGame(4, 300 + i);
    const t = playTurn(g, "complete");
    g.spin();
    if (g.state.pair.ids.includes(t.winnerId)) winnerReappeared = true;
  }
  assert.ok(winnerReappeared);
});
test("لما الكل يكمّل → دورة جديدة (الكل بيبقى متاح تاني)", () => {
  const g = mkGame(4, 21);
  let rounds = new Set();
  for (let i = 0; i < 12; i++) { playTurn(g, "complete"); rounds.add(g.round); }
  assert.ok(g.round > 1);
  assert.ok(g.state.players.every((p) => p.turnsCompleted >= 2));
});
test("لاعب بنقاط الهروب بيتحسب دوره مكتمل زي التحدي", () => {
  const g = mkGame(3, 4);
  const t = playTurn(g, "pay");
  assert.strictEqual(g.player(t.loserId).hasCompletedCurrentRound, true);
});
test("جولدن كارد لوحدها ما بتكمّلش دور اللاعب", () => {
  const g = mkGame(3, 4);
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const p = g.challengePlayer; g.useGolden();
  assert.strictEqual(p.hasCompletedCurrentRound, false);
});
test("تعدّي (skip): من غير نقاط ومن غير إكمال دور", () => {
  const g = mkGame(3, 6);
  const t = playTurn(g, "skip");
  const p = g.player(t.loserId);
  assert.strictEqual(p.score, 0); assert.strictEqual(p.turnsCompleted, 0);
  assert.strictEqual(g.phase, "wheel");
});

console.log("\nمحاكاة العدالة (آلاف اللفّات)");
for (const N of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  test(`N=${N}: اللي كمّل ما يظهرش إلا كـ"ضيف" لما يفضل واحد بس`, () => {
    const g = mkGame(N, 1000 + N);
    let violations = 0, guestOK = 0;
    for (let i = 0; i < 1500; i++) {
      const min = KF.Players.minTurns(g.players);
      const eligible = g.players.filter((p) => p.turnsCompleted === min).map((p) => p.id);
      const sp = g.spin(); g.startRps();
      const ids = g.state.pair.ids;
      const completedInPair = ids.filter((id) => !eligible.includes(id));
      if (eligible.length >= 2 && completedInPair.length) violations++;
      if (eligible.length === 1) {
        assert.ok(ids.includes(eligible[0]), "اللاعب الأخير لازم يكون في الزوج");
        assert.strictEqual(sp.pair.guestId, ids.find((id) => id !== eligible[0]));
        guestOK++;
      }
      let r; do { r = g.submitRps(KF.utils.shuffle(KF.RPS.CHOICES, g.rng)[0], KF.utils.shuffle(KF.RPS.CHOICES, g.rng)[0]); } while (r.result === "draw");
      g.beginChallenge();
      g.completeChallenge();
      if (g.challengesLeft() < 3) g.recycleChallenges();
    }
    assert.strictEqual(violations, 0);
  });
}
for (const N of [3, 4, 6, 8, 10]) {
  test(`N=${N}: التحديات موزعة بالتساوي (الفرق ≤ 3% تقريبًا) ومحدش عالق`, () => {
    // نجمع على أكتر من جيم عشان الصدفة (RPS) ما تلخبطش القياس
    let worstSkew = 0, worstRun = 0;
    for (let seed = 0; seed < 12; seed++) {
      const g = mkGame(N, 2000 + N * 31 + seed);
      let run = 0, lastLoser = null;
      for (let i = 0; i < 600; i++) {
        const t = playTurn(g, "complete");
        run = t.loserId === lastLoser ? run + 1 : 1;
        lastLoser = t.loserId; worstRun = Math.max(worstRun, run);
        if (g.challengesLeft() < 3) g.recycleChallenges();
      }
      const c = g.players.map((p) => p.challengesDone);
      worstSkew = Math.max(worstSkew, (Math.max(...c) - Math.min(...c)) / (c.reduce((a, b) => a + b, 0) / c.length));
    }
    assert.ok(worstSkew < 0.08, "فرق التحديات كبير: " + (worstSkew * 100).toFixed(1) + "%");
    // نفس الشخص يخسر ورا بعض: صدفة RPS في حالة "اللاعب الأخير". بنحدّها حسب العدد
    const limit = N <= 3 ? 9 : N <= 5 ? 7 : 5;
    assert.ok(worstRun <= limit, "نفس الخاسر ورا بعض " + worstRun + " (الحد " + limit + ")");
  });
}
test("مفيش زوجين متطابقين ورا بعض بشكل مزعج (N=6)", () => {
  const g = mkGame(6, 77);
  let same = 0, last = null;
  for (let i = 0; i < 800; i++) {
    g.spin();
    const k = KF.Roulette.pairKey(...g.state.pair.ids);
    if (k === last) same++;
    last = k;
    g.startRps(); let r; do { r = g.submitRps(KF.utils.shuffle(KF.RPS.CHOICES, g.rng)[0], KF.utils.shuffle(KF.RPS.CHOICES, g.rng)[0]); } while (r.result === "draw");
    g.beginChallenge(); g.completeChallenge();
    if (g.challengesLeft() < 3) g.recycleChallenges();
  }
  assert.ok(same / 800 < 0.06, "نسبة التكرار عالية: " + same);
});
test("لاعبين اتنين بس: اللعبة تشتغل وبتلف طبيعي", () => {
  const g = mkGame(2, 5);
  for (let i = 0; i < 30; i++) {
    const t = playTurn(g, "complete");
    assert.deepStrictEqual(t.pair.slice().sort(), ["p1", "p2"]);
  }
  assert.strictEqual(g.players[0].score + g.players[1].score, 150);
});
test("لاعب بيكسب RPS 5 مرات ورا بعض: ما بياخدش نقاط وما بيتحسبش دوره", () => {
  const g = mkGame(3, 9);
  // نخلي p1 دايمًا يكسب لما يظهر
  for (let i = 0; i < 20; i++) {
    g.spin(); g.startRps();
    const [a, b] = g.state.pair.ids;
    let ca = "rock", cb = "rock";
    if (a === "p1") { ca = "rock"; cb = "scissors"; } else if (b === "p1") { ca = "scissors"; cb = "rock"; } else { ca = "rock"; cb = "scissors"; }
    g.submitRps(ca, cb); g.beginChallenge();
    g.completeChallenge();
    if (g.challengesLeft() < 3) g.recycleChallenges();
  }
  assert.strictEqual(g.player("p1").score, 0);
  assert.strictEqual(g.player("p1").turnsCompleted, 0);
  assert.ok(g.player("p1").rpsWins >= 3);
});

console.log("\nترتيب العجلة (السهمين عكس بعض)");
for (const N of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  test(`N=${N}: الاتنين المختارين بالظبط تحت السهمين في كل لفة`, () => {
    const ids = Array.from({ length: N }, (_, i) => "p" + (i + 1));
    for (let t = 0; t < 400; t++) {
      const r = rng(t * 31 + N);
      const x = ids[Math.floor(r() * N)];
      let y; do { y = ids[Math.floor(r() * N)]; } while (y === x);
      const L = KF.Roulette.buildLayout(ids, [x, y], r);
      assert.strictEqual(L.M, N % 2 === 0 ? N : 2 * N);
      const angle = KF.Roulette.landingAngle(L, Math.floor(r() * 1000), 5 + Math.floor(r() * 4), r, 0.28);
      const topSlot = KF.Roulette.slotAtTop(angle, L.M);
      const botSlot = KF.Roulette.slotAtTop(angle + 180, L.M);
      assert.strictEqual(topSlot, L.top);
      assert.strictEqual(botSlot, L.bottom);
      const got = new Set([L.slots[topSlot], L.slots[botSlot]]);
      assert.ok(got.has(x) && got.has(y) && got.size === 2, `N=${N} got ${[...got]} want ${x},${y}`);
      assert.ok(angle >= 5 * 360, "لازم يلف لفّات كاملة");
    }
  });
}
test("كل لاعب ظاهر على العجلة (مرة أو مرتين)", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const L = KF.Roulette.buildLayout(ids, ["a", "b"], rng(3));
  ids.forEach((id) => assert.strictEqual(L.slots.filter((s) => s === id).length, 2));
  const ids2 = ["a", "b", "c", "d"];
  const L2 = KF.Roulette.buildLayout(ids2, ["a", "c"], rng(3));
  ids2.forEach((id) => assert.strictEqual(L2.slots.filter((s) => s === id).length, 1));
});
test("أسماء متشابهة: المنطق بيشتغل بالـID والأسماء بتتميّز", () => {
  const g = mkGame(3, 1, { names: ["محمد", "محمد", "محمد"] });
  const names = g.players.map((p) => p.name);
  assert.strictEqual(new Set(names).size, 3);
  assert.strictEqual(new Set(g.players.map((p) => p.id)).size, 3);
});

console.log("\nتنظيف الأسماء");
test("فاضي / مسافات / طويل / HTML", () => {
  const { names, notes } = KF.Players.sanitizeNames(["  ", "  أحمد   علي  ", "<b>x</b>", "ا".repeat(40)], { maxLength: 14 });
  assert.strictEqual(names[0], "لاعب 1");
  assert.strictEqual(names[1], "أحمد علي");
  assert.ok(!names[2].includes("<"));
  assert.ok(names[3].length <= 14);
  assert.ok(notes.some((n) => n.kind === "empty"));
});
test("أسماء مكررة بتتحول لأسماء مختلفة", () => {
  const { names, notes } = KF.Players.sanitizeNames(["سعد", "سعد", "سعد"]);
  assert.strictEqual(new Set(names).size, 3);
  assert.ok(notes.filter((n) => n.kind === "duplicate").length >= 2);
});

console.log("\nالتحديات");
test("نصوص التحديات كما كتبتها حرفيًا (58 تحدي — بعد شيل علامة ':' وسطرين ملاحظات)", () => {
  // tests/challenges-source.txt = السطور الأصلية من ملفك بالظبط (60 سطر). السطرين 15 و 20 ملاحظات مش تحديات.
  const fs = require("fs");
  const src = fs.readFileSync(path.join(__dirname, "challenges-source.txt"), "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  assert.strictEqual(src.length, 60);
  assert.ok(/ومعلش حته صياعه/.test(src[14]) && /يبقوا موجودين هنا برضو/.test(src[19]), "سطور الملاحظات مش في مكانها");
  const lines = src.filter((_, i) => ![14, 19].includes(i)).map((l) => l.replace(/^:\s*/, ""));
  assert.strictEqual(KF.DATA.challenges.length, 58);
  lines.forEach((l, i) => assert.strictEqual(KF.DATA.challenges[i].text, l, "اختلاف في التحدي " + (i + 1)));
});
test("كل تحدي id فريد وله نص", () => {
  const ids = new Set(); CH.forEach((c) => { assert.ok(c.text.trim()); assert.ok(!ids.has(c.id)); ids.add(c.id); });
});
test("إضافة تحدي جديد بـ text بس تشتغل (ومعاها id تلقائي)", () => {
  const l = KF.Challenges.buildList([{ text: "أ" }, "ب", { text: "" }, null]);
  assert.strictEqual(l.length, 2);
  assert.strictEqual(l[0].points, 5);
  assert.notStrictEqual(l[0].id, l[1].id);
});
test("ids مكررة بتتصلح", () => {
  const l = KF.Challenges.buildList([{ id: "x", text: "1" }, { id: "x", text: "2" }]);
  assert.notStrictEqual(l[0].id, l[1].id);
});
test("التحدي ما بيتكررش لحد ما التحديات تخلص", () => {
  const g = mkGame(4, 8);
  const seen = new Set();
  for (let i = 0; i < CH.length; i++) {
    const t = playTurn(g, "complete");
    assert.ok(!t.noChallenge);
    const id = g.state.usedChallengeIds[g.state.usedChallengeIds.length - 1];
    assert.ok(!seen.has(id), "تكرر " + id); seen.add(id);
  }
  assert.strictEqual(g.challengesLeft(), 0);
});
test("لما التحديات تخلص: beginChallenge بيرجع noChallenge من غير ما يكسر", () => {
  const g = mkGame(3, 1, { challenges: KF.Challenges.buildList([{ text: "1" }]) });
  playTurn(g, "complete");
  g.spin(); g.startRps(); g.submitRps("rock", "paper");
  const r = g.beginChallenge();
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, "noChallenge");
  assert.strictEqual(g.phase, "rps");
  assert.ok(g.recycleChallenges() >= 1);
  assert.ok(g.beginChallenge().ok);
});
test("مفيش نفس الفئة ورا بعض بشكل مزعج", () => {
  const g = mkGame(5, 12);
  let sameCat = 0, last = null, n = 0;
  for (let i = 0; i < 40; i++) {
    playTurn(g, "complete"); n++;
    const c = CH.find((x) => x.id === g.state.usedChallengeIds[g.state.usedChallengeIds.length - 1]);
    if (c.category === last) sameCat++;
    last = c.category;
  }
  assert.ok(sameCat / n < 0.3, "نسبة تكرار الفئة " + sameCat / n);
});
test("إعدادات الحزام/الشطة بتشيل التحديات المرتبطة بيهم", () => {
  const g = mkGame(3, 1, { settings: { enableBelt: false, enableSpicy: false } });
  const belt = CH.filter((c) => c.flags.includes("belt") || c.flags.includes("spicy")).map((c) => c.id);
  assert.ok(belt.length >= 2);
  for (let i = 0; i < 100; i++) {
    const c = KF.Challenges.pick(CH, { usedChallengeIds: [] }, g.settings, rng(i));
    assert.ok(!belt.includes(c.id));
  }
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  assert.ok(!g.availableEscapes().some((e) => e.id === "belt"));
  assert.strictEqual(g.useEscape("belt").ok, false);
});
test("وسائل الهروب: الجولدن ظاهرة ومتاحة أول مرة", () => {
  const g = mkGame(3);
  g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const list = g.availableEscapes();
  assert.strictEqual(list.length, 5);
  assert.strictEqual(list.find((e) => e.id === "golden").disabled, false);
});

console.log("\nالجايزة");
const P = (name, score, golden) => ({ id: name, name, score, goldenCardAvailable: golden, turnsCompleted: 1, challengesDone: 1 });
test("فايز واحد ياخد كل الصندوق", () => {
  const r = KF.Prize.compute([P("a", 10, false), P("b", 5, true)], 25);
  assert.strictEqual(r.winners.length, 1); assert.strictEqual(r.winners[0].amount, 25);
});
test("أعلى نقاط ومستخدمش الجولدن → بيتحسب كفردين (حصتين)", () => {
  const r = KF.Prize.compute([P("a", 10, true), P("b", 5, true)], 20);
  assert.strictEqual(r.winners[0].shares, 2); assert.strictEqual(r.winners[0].doubled, true);
});
test("تعادل: اللي ما استخدمش الجولدن ياخد ضعف اللي استخدمها", () => {
  const r = KF.Prize.compute([P("a", 10, true), P("b", 10, false)], 30);
  const a = r.winners.find((w) => w.id === "a"), b = r.winners.find((w) => w.id === "b");
  assert.strictEqual(a.amount, 20); assert.strictEqual(b.amount, 10);
  assert.strictEqual(a.amount + b.amount, 30);
});
test("تعادل والاتنين ما استخدموش → نص بنص", () => {
  const r = KF.Prize.compute([P("a", 7, true), P("b", 7, true)], 10);
  assert.strictEqual(r.winners[0].amount, 5); assert.strictEqual(r.winners[1].amount, 5);
});
test("تعادل تلاتة والمجموع بيساوي الصندوق (تقريبًا للكسور)", () => {
  const r = KF.Prize.compute([P("a", 7, true), P("b", 7, false), P("c", 7, true)], 25);
  const sum = r.winners.reduce((s, w) => s + w.amount, 0);
  assert.ok(Math.abs(sum - 25) < 0.05);
});
test("صندوق فاضي أو كل النقاط صفر → مفيش فايز ومفيش كراش", () => {
  assert.strictEqual(KF.Prize.compute([P("a", 0, true), P("b", 0, true)], 15).noWinner, true);
  const r = KF.Prize.compute([P("a", 5, true)], 0);
  assert.strictEqual(r.winners[0].amount, 0);
  assert.strictEqual(KF.Prize.compute([], 10).noWinner, true);
});
test("الترتيب: التعادل بيدي نفس المركز", () => {
  const r = KF.Scoring.ranking([P("a", 5, true), P("b", 9, true), P("c", 5, true), P("d", 1, true)]);
  assert.deepStrictEqual(r.map((x) => x.rank), [1, 2, 2, 4]);
});
test("نهاية اللعبة بتحسب الجايزة من الصندوق الحقيقي", () => {
  const g = mkGame(3, 3);
  playTurn(g, "pay"); playTurn(g, "pay"); playTurn(g, "complete");
  const res = g.endGame();
  assert.strictEqual(res.pool, 10);
  assert.strictEqual(g.phase, "ended");
  assert.ok(res.prize.winners.length >= 1);
});

console.log("\nالحفظ والاسترجاع + حالات غريبة");
test("serialize/restore بيحافظ على كل حاجة", () => {
  const g = mkGame(4, 5);
  playTurn(g, "pay"); playTurn(g, "complete");
  const saved = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = KF.Game.restore(saved, { challenges: CH });
  assert.ok(g2);
  assert.deepStrictEqual(g2.players.map((p) => p.score), g.players.map((p) => p.score));
  assert.strictEqual(g2.state.prizePool, g.state.prizePool);
  assert.strictEqual(g2.round, g.round);
  assert.deepStrictEqual(g2.state.usedChallengeIds, g.state.usedChallengeIds);
});
test("ريفرش أثناء الاختيار (selected) بيكمل من نفس الاتنين", () => {
  const g = mkGame(4, 5); g.spin();
  const g2 = KF.Game.restore(JSON.parse(JSON.stringify(g.serialize())), { challenges: CH });
  assert.strictEqual(g2.phase, "selected");
  assert.deepStrictEqual(g2.state.pair.ids, g.state.pair.ids);
});
test("ريفرش أثناء الـRPS بيرجع لبداية الـRPS بنفس الاتنين", () => {
  const g = mkGame(4, 5); g.spin(); g.startRps();
  const g2 = KF.Game.restore(JSON.parse(JSON.stringify(g.serialize())), { challenges: CH });
  assert.strictEqual(g2.phase, "rps");
  assert.ok(g2.submitRps("rock", "paper").ok);
});
test("ريفرش أثناء التحدي بيرجع لنفس التحدي واللاعب", () => {
  const g = mkGame(4, 5); g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const g2 = KF.Game.restore(JSON.parse(JSON.stringify(g.serialize())), { challenges: CH });
  assert.strictEqual(g2.phase, "challenge");
  assert.strictEqual(g2.state.challenge.id, g.state.challenge.id);
  assert.strictEqual(g2.challengePlayer.id, g.challengePlayer.id);
  assert.ok(g2.completeChallenge().ok);
});
test("ريفرش بعد استخدام الجولدن: الكارت فضل مستخدم", () => {
  const g = mkGame(4, 5); g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge(); g.useGolden();
  const g2 = KF.Game.restore(JSON.parse(JSON.stringify(g.serialize())), { challenges: CH });
  assert.strictEqual(g2.challengePlayer.goldenCardAvailable, false);
  assert.strictEqual(g2.useGolden().ok, false);
});
test("جلسة تالفة/نسخة قديمة/ناقصة → restore بيرجع null مش بيكسر", () => {
  assert.strictEqual(KF.Game.restore(null), null);
  assert.strictEqual(KF.Game.restore({}), null);
  assert.strictEqual(KF.Game.restore({ version: 999 }), null);
  assert.strictEqual(KF.Game.restore({ version: 1, players: [] }), null);
  assert.strictEqual(KF.Game.restore({ version: 1, players: [{ id: "a", name: "x" }, { id: "a", name: "y" }] }), null);
  assert.strictEqual(KF.Game.restore("garbage"), null);
});
test("تحدي اتحذف من الملف بعد الحفظ → بيرجع للعجلة بأمان", () => {
  const g = mkGame(4, 5); g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const saved = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = KF.Game.restore(saved, { challenges: CH.filter((c) => c.id !== saved.challenge.id) });
  assert.strictEqual(g2.phase, "wheel");
  assert.strictEqual(g2.state.challenge, null);
});
test("إنهاء اللعبة أثناء التحدي: بيوصل للنتائج من غير نقاط للتحدي", () => {
  const g = mkGame(3, 5); g.spin(); g.startRps(); g.submitRps("rock", "paper"); g.beginChallenge();
  const res = g.endGame();
  assert.strictEqual(g.phase, "ended");
  assert.ok(res.ranking.every((r) => r.player.score === 0));
  assert.strictEqual(g.state.challenge, null);
});
test("لعبة انتهت: مفيش أفعال بتشتغل بعدها", () => {
  const g = mkGame(3, 5); g.endGame();
  assert.strictEqual(g.spin().ok, false);
  assert.strictEqual(g.completeChallenge().ok, false);
});
test("خروج ثم جيم جديد: الحالات مستقلة تمامًا", () => {
  const a = mkGame(3, 1); playTurn(a, "pay");
  const b = mkGame(3, 1);
  assert.strictEqual(b.state.prizePool, 0);
  assert.ok(b.players.every((p) => p.score === 0 && p.goldenCardAvailable));
  assert.notStrictEqual(a.state.sessionId, b.state.sessionId);
});
test("العب تاني بنفس اللاعبين: النقاط والكروت بتتصفّر والأسماء والأفاتارات بتفضل", () => {
  const g = mkGame(4, 5, { names: ["أحمد", "سعد", "منى", "علا"] });
  playTurn(g, "pay"); playTurn(g, "complete");
  g.players[0].goldenCardAvailable = false;
  const g2 = KF.Game.rematch(g);
  assert.deepStrictEqual(g2.players.map((p) => p.name), ["أحمد", "سعد", "منى", "علا"]);
  assert.deepStrictEqual(g2.players.map((p) => p.avatarId), g.players.map((p) => p.avatarId));
  assert.ok(g2.players.every((p) => p.score === 0 && p.goldenCardAvailable && p.turnsCompleted === 0));
  assert.strictEqual(g2.state.prizePool, 0);
});
test("skipPair بيرجع للعجلة من غير أي أثر على النقاط", () => {
  const g = mkGame(4, 5); g.spin();
  assert.ok(g.skipPair().ok);
  assert.strictEqual(g.phase, "wheel");
  assert.ok(g.players.every((p) => p.score === 0));
});
test("أقصى عدد لاعبين (10) بيشتغل كامل", () => {
  const g = mkGame(10, 42);
  for (let i = 0; i < 100; i++) { playTurn(g, i % 3 === 0 ? "pay" : "complete"); if (g.challengesLeft() < 3) g.recycleChallenges(); }
  assert.ok(g.players.every((p) => p.timesAppeared > 0));
});

console.log("\nالباسورد (تطبيع النص العربي)");
test("كل صيغ يوم ورا يوم بتتقبل", () => {
  const norm = KF.utils.normalizeArabic;
  const targets = KF.CONFIG.password.answers.map(norm);
  ["يوم ورا يوم", "  يوم   ورا  يوم ", "يَوم وَرا يَوم", "يوم وراء يوم", "يوم ورا يوم!!", "يـــوم ورا يوم"].forEach((s) =>
    assert.ok(targets.includes(norm(s)), "رفض: " + s));
  ["يوم ورا", "ليلة ورا ليلة", "", "abc"].forEach((s) => assert.ok(!targets.includes(norm(s)), "قبل غلط: " + s));
});
test("levenshtein", () => {
  assert.strictEqual(KF.utils.levenshtein("ورا", "ورا"), 0);
  assert.strictEqual(KF.utils.levenshtein("ورا", "وارا"), 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { failures.forEach(([n, e]) => console.error("FAIL:", n, "\n", e.stack)); process.exit(1); }
