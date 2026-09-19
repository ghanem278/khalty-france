/* Game Logic — ماكينة حالة اللعبة (State Machine).
   بدون DOM وبدون أي Browser API: تتختبر في Node وتتحول لـ APK بسهولة.

   phase:  wheel      → مستني لفّة العجلة
           selected   → اتحدد اتنين (بيظهروا على الشاشة)
           rps        → حجر ورقة مقص
           challenge  → التحدي ظاهر لخسران الجولة
           ended      → نهاية اللعبة (النتائج)
*/
(function (root) {
  const KF = (root.KF = root.KF || {});
  const STATE_VERSION = 1;

  class Game {
    constructor({ state, challenges, escapes, settings, rng } = {}) {
      this.state = state;
      this.challenges = challenges || [];
      this.escapes = escapes || KF.DATA.escapes;
      this.settings = settings || KF.DEFAULT_SETTINGS;
      this.rng = rng || Math.random;
    }

    /* ---------- إنشاء / استرجاع ---------- */
    static create({ players, challenges, escapes, settings, rng }) {
      const state = {
        version: STATE_VERSION,
        sessionId: KF.utils.uid("s"),
        phase: "wheel",
        players,
        spinIndex: 0,
        pair: null,            // { ids:[a,b], guestId, layout }
        rps: null,             // { winnerId, loserId, rounds }
        challenge: null,       // { id, playerId, points, startedAt, changedByGolden }
        usedChallengeIds: [],
        recentCategories: [],
        pairCounts: {},
        lastPair: null,
        prizePool: 0,
        log: [],
        endedAt: null,
      };
      KF.Players.refreshRoundFlags(state.players);
      return new Game({ state, challenges, escapes, settings, rng });
    }

    /* استرجاع آمن: أي حاجة غلط → نرجع لوضع سليم من غير ما نكسر اللعبة */
    static restore(saved, { challenges, escapes, settings, rng } = {}) {
      try {
        if (!saved || saved.version !== STATE_VERSION) return null;
        if (!Array.isArray(saved.players) || saved.players.length < 2) return null;
        const s = KF.utils.clone(saved);
        const ids = new Set();
        for (const p of s.players) {
          if (!p || typeof p.id !== "string" || typeof p.name !== "string" || ids.has(p.id)) return null;
          ids.add(p.id);
          p.score = Number.isFinite(p.score) ? p.score : 0;
          p.turnsCompleted = Number.isFinite(p.turnsCompleted) ? p.turnsCompleted : 0;
          p.goldenCardAvailable = p.goldenCardAvailable !== false;
        }
        s.usedChallengeIds = Array.isArray(s.usedChallengeIds) ? s.usedChallengeIds : [];
        s.recentCategories = Array.isArray(s.recentCategories) ? s.recentCategories : [];
        s.pairCounts = s.pairCounts && typeof s.pairCounts === "object" ? s.pairCounts : {};
        s.prizePool = Number.isFinite(s.prizePool) ? s.prizePool : 0;
        s.log = Array.isArray(s.log) ? s.log : [];
        const g = new Game({ state: s, challenges, escapes, settings, rng });
        g._sanitizePhase();
        KF.Players.refreshRoundFlags(s.players);
        return g;
      } catch (e) {
        return null;
      }
    }

    _sanitizePhase() {
      const s = this.state;
      const valid = (id) => s.players.some((p) => p.id === id);
      const has = (p) => p && p.ids && p.ids.length === 2 && p.ids.every(valid);
      if (s.phase === "selected" || s.phase === "rps") {
        if (!has(s.pair)) { this._toWheel(); }
        else if (s.phase === "rps") { /* ريفرش: نبدأ الـRPS من الأول بنفس الاتنين */ s.rps = { winnerId: null, loserId: null, rounds: 0 }; }
      } else if (s.phase === "challenge") {
        const ch = s.challenge && this.challenges.find((c) => c.id === s.challenge.id);
        if (!s.challenge || !valid(s.challenge.playerId) || !ch) this._toWheel();
        else s.challenge.startedAt = Date.now(); // نعيد عدّاد الـ70 ثانية
      } else if (!["wheel", "ended"].includes(s.phase)) {
        this._toWheel();
      }
    }

    serialize() { return KF.utils.clone(this.state); }

    /* ---------- Getters ---------- */
    get players() { return this.state.players; }
    get phase() { return this.state.phase; }
    player(id) { return this.state.players.find((p) => p.id === id) || null; }
    get round() { return KF.Players.minTurns(this.state.players) + 1; }
    get currentChallenge() {
      const c = this.state.challenge;
      return c ? this.challenges.find((x) => x.id === c.id) || null : null;
    }
    get challengePlayer() { return this.state.challenge ? this.player(this.state.challenge.playerId) : null; }
    challengesLeft() { return KF.Challenges.remaining(this.challenges, this.state, this.settings); }

    _log(type, data) {
      this.state.log.push(Object.assign({ type, t: Date.now() }, data || {}));
      if (this.state.log.length > 200) this.state.log.shift();
    }
    _setStatuses(ids, status) { ids.forEach((id) => { const p = this.player(id); if (p) p.status = status; }); }
    _resetStatuses() {
      this.state.players.forEach((p) => {
        p.status = p.hasCompletedCurrentRound ? "completed" : "idle";
        p.hasReceivedChallenge = false;
        p.hasSuccessfullyCompletedChallenge = false;
      });
    }
    _toWheel() {
      const s = this.state;
      s.phase = "wheel"; s.pair = null; s.rps = null; s.challenge = null;
      this._resetStatuses();
    }

    /* ---------- 1) لفّ العجلة ---------- */
    spin() {
      const s = this.state;
      if (s.phase !== "wheel") return { ok: false, reason: "phase" };
      const pick = KF.Roulette.pickPair(s.players, { spinIndex: s.spinIndex, lastPair: s.lastPair, pairCounts: s.pairCounts }, this.rng);
      const layout = KF.Roulette.buildLayout(s.players.map((p) => p.id), pick.ids, this.rng);
      s.spinIndex += 1;
      pick.ids.forEach((id) => { const p = this.player(id); p.timesAppeared++; p.lastAppearedSpin = s.spinIndex; });
      const key = KF.Roulette.pairKey(pick.ids[0], pick.ids[1]);
      s.pairCounts[key] = (s.pairCounts[key] || 0) + 1;
      s.lastPair = pick.ids.slice();
      s.pair = { ids: pick.ids, guestId: pick.guestId, layout };
      s.phase = "selected";
      this._setStatuses(pick.ids, "selected");
      this._log("spin", { ids: pick.ids, guest: pick.guestId });
      return { ok: true, pair: s.pair };
    }

    /* ---------- 2) نبدأ حجر ورقة مقص ---------- */
    startRps() {
      const s = this.state;
      if (s.phase !== "selected" || !s.pair) return { ok: false, reason: "phase" };
      s.phase = "rps";
      s.rps = { winnerId: null, loserId: null, rounds: 0 };
      this._setStatuses(s.pair.ids, "rps");
      return { ok: true };
    }

    /* choices: اختيار كل لاعب بنفس ترتيب pair.ids. بيرجع draw أو الفايز والخاسر */
    submitRps(choiceA, choiceB) {
      const s = this.state;
      if (s.phase !== "rps" || !s.rps) return { ok: false, reason: "phase" };
      const r = KF.RPS.resolve(choiceA, choiceB);
      s.rps.rounds++;
      const [a, b] = s.pair.ids;
      if (r === "draw") return { ok: true, result: "draw", rounds: s.rps.rounds };
      const winnerId = r === "a" ? a : b;
      const loserId = r === "a" ? b : a;
      s.rps.winnerId = winnerId; s.rps.loserId = loserId;
      const w = this.player(winnerId), l = this.player(loserId);
      w.rpsWins++; l.rpsLosses++;
      w.status = "idle"; // الفايز يفلت وفضل متاح
      this._log("rps", { winnerId, loserId });
      return { ok: true, result: "decided", winnerId, loserId, rounds: s.rps.rounds };
    }

    /* الفايز في الـRPS بيهرب: مفيش نقاط ومفيش "دور مكتمل" → يفضل متاح */
    /* ---------- 3) الخاسر ياخد تحدي ---------- */
    beginChallenge() {
      const s = this.state;
      if (s.phase !== "rps" || !s.rps || !s.rps.loserId) return { ok: false, reason: "phase" };
      const ch = this._drawChallenge();
      if (!ch) {
        // مفيش تحديات — نرجّع الوضع لسه على RPS ونسيب الواجهة تقرر (نهاية اللعبة / إعادة التحديات)
        return { ok: false, reason: "noChallenge" };
      }
      s.phase = "challenge";
      s.challenge = { id: ch.id, playerId: s.rps.loserId, points: KF.Scoring.pointsForChallenge(ch), startedAt: Date.now(), changedByGolden: false };
      const p = this.player(s.rps.loserId);
      p.status = "challenged"; p.hasReceivedChallenge = true;
      return { ok: true, challenge: ch, player: p };
    }

    _drawChallenge(extraExclude = []) {
      const s = this.state;
      const ch = KF.Challenges.pick(this.challenges, s, this.settings, this.rng, extraExclude);
      if (!ch) return null;
      s.usedChallengeIds.push(ch.id);
      s.recentCategories.push(ch.category);
      if (s.recentCategories.length > 6) s.recentCategories.shift();
      return ch;
    }

    /* لما التحديات تخلص واللاعبين يختاروا يكملوا: نصفّر المستخدم */
    recycleChallenges() {
      this.state.usedChallengeIds = [];
      this.state.recentCategories = [];
      return this.challengesLeft();
    }

    /* ---------- إكمال الدور (مشترك) ---------- */
    _completeTurn(player, { challengeDone }) {
      const before = KF.Players.minTurns(this.state.players);
      player.turnsCompleted++;
      if (challengeDone) player.challengesDone++; else player.escapesUsed++;
      player.hasSuccessfullyCompletedChallenge = true;
      const after = KF.Players.refreshRoundFlags(this.state.players);
      return { newRound: after > before, round: after + 1 };
    }

    _finishTurn() {
      this._toWheel();
      this.state.lastPair = this.state.lastPair; // (مقصود: نحتفظ بآخر زوج)
    }

    /* ---------- 4) تم ---------- */
    completeChallenge() {
      const s = this.state;
      if (s.phase !== "challenge" || !s.challenge) return { ok: false, reason: "phase" };
      const p = this.player(s.challenge.playerId);
      const pts = s.challenge.points;
      KF.Scoring.addPoints(p, pts);
      const rr = this._completeTurn(p, { challengeDone: true });
      this._log("challengeDone", { playerId: p.id, pts });
      const result = { ok: true, playerId: p.id, points: pts, newRound: rr.newRound, round: rr.round, kind: "challenge" };
      this._toWheel();
      return result;
    }

    /* ---------- 5) وسائل الهروب ---------- */
    availableEscapes() {
      const p = this.challengePlayer;
      return this.escapes.map((e) => {
        let disabled = false, reason = null;
        if (e.flags && e.flags.includes("belt") && this.settings.enableBelt === false) { disabled = true; reason = "off"; }
        if (e.special === "golden") {
          if (!KF.Golden.canUse(p)) { disabled = true; reason = "used"; }
        }
        return Object.assign({}, e, { disabled, reason });
      }).filter((e) => e.reason !== "off");
    }

    useEscape(escapeId) {
      const s = this.state;
      if (s.phase !== "challenge" || !s.challenge) return { ok: false, reason: "phase" };
      const esc = KF.Scoring.escapeById(escapeId, this.escapes);
      if (!esc || esc.special === "golden") return { ok: false, reason: "unknown" };
      if (esc.flags && esc.flags.includes("belt") && this.settings.enableBelt === false) return { ok: false, reason: "disabled" };
      const p = this.player(s.challenge.playerId);
      KF.Scoring.addPoints(p, esc.points);              // بياخد نقاط الخيار اللي اختاره فعلًا
      if (esc.money) s.prizePool += esc.money;
      const rr = this._completeTurn(p, { challengeDone: false });
      this._log("escape", { playerId: p.id, escapeId, pts: esc.points, money: esc.money || 0 });
      const result = { ok: true, playerId: p.id, points: esc.points, money: esc.money || 0, escapeId, newRound: rr.newRound, round: rr.round, kind: "escape" };
      this._toWheel();
      return result;
    }

    /* الجولدن كارد: يغيّر التحدي مرة واحدة بس، ومفيهاش نقاط */
    useGolden() {
      const s = this.state;
      if (s.phase !== "challenge" || !s.challenge) return { ok: false, reason: "phase" };
      const p = this.player(s.challenge.playerId);
      if (!KF.Golden.canUse(p)) return { ok: false, reason: "used" };
      const ch = this._drawChallenge([s.challenge.id]);
      if (!ch) return { ok: false, reason: "noChallenge" };   // الكارت ما بيتحرقش لو مفيش بديل
      KF.Golden.consume(p);
      s.challenge = { id: ch.id, playerId: p.id, points: KF.Scoring.pointsForChallenge(ch), startedAt: Date.now(), changedByGolden: true };
      this._log("golden", { playerId: p.id, newId: ch.id });
      return { ok: true, challenge: ch, player: p };
    }

    /* تعدّي: من غير نقاط ومن غير ما الدور يتحسب */
    skipChallenge() {
      const s = this.state;
      if (s.phase !== "challenge" || !s.challenge) return { ok: false, reason: "phase" };
      if (KF.CONFIG.allowSkipChallenge === false) return { ok: false, reason: "disabled" };
      const id = s.challenge.playerId;
      this._log("skip", { playerId: id });
      this._toWheel();
      return { ok: true, playerId: id, points: 0 };
    }

    /* تعدّي زوج العجلة/الـRPS ونلف من جديد (مفيش تأثير على النقاط) */
    skipPair() {
      const s = this.state;
      if (!["selected", "rps"].includes(s.phase)) return { ok: false, reason: "phase" };
      this._log("skipPair", { ids: s.pair && s.pair.ids });
      this._toWheel();
      return { ok: true };
    }

    /* ---------- النهاية ---------- */
    endGame() {
      const s = this.state;
      s.phase = "ended";
      s.endedAt = Date.now();
      s.pair = null; s.rps = null; s.challenge = null;
      this._log("end", {});
      return this.results();
    }

    results() {
      const s = this.state;
      return {
        ranking: KF.Scoring.ranking(s.players),
        prize: KF.Prize.compute(s.players, s.prizePool),
        pool: s.prizePool,
      };
    }

    /* نفس اللاعبين، جيم جديد (النقاط والكروت بتتصفّر) */
    static rematch(game) {
      const specs = game.state.players.map((p) => ({ name: p.name, avatarId: p.avatarId }));
      const players = KF.Players.buildPlayers(specs, { maxLength: 40 });
      return Game.create({ players, challenges: game.challenges, escapes: game.escapes, settings: game.settings, rng: game.rng });
    }
  }

  KF.Game = Game;
  if (typeof module !== "undefined") module.exports = Game;
})(typeof window !== "undefined" ? window : globalThis);
