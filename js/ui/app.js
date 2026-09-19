/* App — الكنترولر الرئيسي: الراوتر، شريط الأزرار الثابت، حفظ الجلسة، الإعدادات */
(function (root) {
  const KF = (root.KF = root.KF || {});
  const doc = root.document;
  const { h, icon, iconButton, button, avatar, dialog, sheet, toast } = KF.UI;
  const C = KF.CONFIG;

  const App = {
    game: null,
    settings: null,
    screens: {},
    current: null,          // { id, el, mod, ctrl }
    challenges: [],
    lastScoreSnapshot: {},  // للـcount-up
    _busy: false,

    /* ---------- تشغيل ---------- */
    init() {
      this.settings = Object.assign({}, KF.DEFAULT_SETTINGS, KF.Storage.get(C.storageKeys.settings, {}));
      this.challenges = KF.Challenges.buildList(KF.DATA.challenges);
      this.applySettings(false);
      KF.Audio.init(this.settings);
      KF.UI.installPressFeedback();
      this.buildChrome();
      this.restoreSession();

      root.addEventListener("popstate", () => this.onBack());
      try { root.history.replaceState({ kf: 0 }, ""); root.history.pushState({ kf: 1 }, ""); } catch (e) {}
      doc.addEventListener("visibilitychange", () => {
        if (doc.hidden) { KF.Audio.suspend(); this.saveSession(); } else KF.Audio.resume();
      });
      root.addEventListener("pagehide", () => this.saveSession());
      root.addEventListener("error", (e) => console.warn("KF error:", e.message));

      const boot = doc.getElementById("boot");
      if (boot) { boot.classList.add("gone"); root.setTimeout(() => boot.remove(), 500); }
      this.go(C.flow[0]);
    },

    register(id, mod) { this.screens[id] = mod; },

    /* ---------- الإعدادات ---------- */
    applySettings(persist = true) {
      const s = this.settings;
      KF.Haptics.enabled = !!s.haptics;
      KF.VFX.reduced = !!s.reducedEffects;
      doc.body.classList.toggle("reduced-fx", !!s.reducedEffects);
      KF.Audio.configure({ music: s.music, sfx: s.sfx, musicVolume: s.musicVolume, sfxVolume: s.sfxVolume });
      if (this.game) this.game.settings = s;
      if (persist) KF.Storage.set(C.storageKeys.settings, s);
      this.refreshChrome();
    },
    setSetting(k, v) { this.settings[k] = v; this.applySettings(); },

    /* ---------- الجلسة ---------- */
    saveSession() {
      if (this.game && this.game.phase !== "ended") KF.Storage.set(C.storageKeys.session, this.game.serialize());
    },
    clearSession() { KF.Storage.remove(C.storageKeys.session); },
    restoreSession() {
      const saved = KF.Storage.get(C.storageKeys.session, null);
      this.savedGame = null;
      if (!saved) return;
      const g = KF.Game.restore(saved, { challenges: this.challenges, settings: this.settings });
      if (g && g.phase !== "ended") this.savedGame = g; else this.clearSession();
    },
    startGame(players) {
      this.game = KF.Game.create({ players, challenges: this.challenges, settings: this.settings });
      this.lastScoreSnapshot = {};
      this.saveSession();
    },
    resumeGame() {
      if (!this.savedGame) return false;
      this.game = this.savedGame; this.savedGame = null;
      this.game.settings = this.settings;
      this.go(this.screenForPhase());
      return true;
    },
    screenForPhase() {
      const p = this.game ? this.game.phase : null;
      return p === "rps" ? "rps" : p === "challenge" ? "challenge" : p === "ended" ? "results" : "main";
    },
    /* بعد أي تغيير في اللعبة: احفظ وروح للشاشة المناسبة */
    sync(to) { this.saveSession(); this.go(to || this.screenForPhase()); },

    /* ---------- الراوتر ---------- */
    async go(id, params = {}) {
      const mod = this.screens[id];
      if (!mod) { console.error("screen not found", id); return; }
      if (this._busy) { this._pending = [id, params]; return; }
      this._busy = true;
      const host = doc.getElementById("screens");
      const prev = this.current;
      const el = h("section", { class: "screen enter", "data-screen": id });
      const meta = mod.meta || {};
      if (meta.chrome !== "none") el.classList.add("has-chrome");
      let ctrl = null;
      try { ctrl = mod.mount(el, params, this) || {}; }
      catch (e) { console.error(e); toast("حصلت مشكلة — بنرجعك للبداية"); this._busy = false; this.game = null; return this.go("splash"); }
      host.append(el);
      this.current = { id, el, mod, ctrl, params };
      this.refreshChrome();
      if (prev) {
        prev.el.classList.add("leave");
        try { prev.ctrl && prev.ctrl.destroy && prev.ctrl.destroy(); } catch (e) {}
        root.setTimeout(() => prev.el.remove(), 250);
      }
      root.setTimeout(() => el.classList.remove("enter"), 520);
      this._busy = false;
      if (this._pending) { const [pid, pp] = this._pending; this._pending = null; this.go(pid, pp); }
    },

    /* التالي في تسلسل البداية */
    next() {
      const i = C.flow.indexOf(this.current.id);
      const nxt = C.flow[i + 1];
      this.go(nxt || "setup");
    },
    prev() {
      const i = C.flow.indexOf(this.current.id);
      this.go(i > 0 ? C.flow[i - 1] : "splash");
    },

    /* ---------- الشريط الثابت (خروج / نتائج / إعدادات / صوت) ---------- */
    buildChrome() {
      const bar = doc.getElementById("chrome");
      this.btnExit = iconButton("exit", "خروج", { cls: "danger", onClick: () => this.confirmExit() });
      this.btnBoard = iconButton("trophy", "النتائج", { onClick: () => this.openScoreboard() });
      this.poolChip = h("div", { class: "chip green pool", "aria-label": "الصندوق" }, icon("coin", ""), h("span", { id: "pool-val" }, "0"));
      this.poolChip.querySelector("svg").style.cssText = "width:20px;height:20px";
      this.btnSettings = iconButton("gear", "الإعدادات", { onClick: () => this.openSettings() });
      this.btnSound = iconButton("sound", "الصوت", { onClick: () => this.toggleSound() });
      bar.append(this.btnExit, this.btnBoard, this.poolChip, this.btnSettings, this.btnSound);
      this.chrome = bar;
    },
    refreshChrome() {
      if (!this.chrome) return;
      const id = this.current && this.current.id;
      const mod = id && this.screens[id];
      const mode = (mod && mod.meta && mod.meta.chrome) || "full";
      const inGame = !!this.game && ["main", "rps", "challenge"].includes(id);
      this.chrome.classList.toggle("chrome-hidden", mode === "none");
      this.btnExit.hidden = !inGame && mode !== "exit";
      this.btnBoard.hidden = !inGame;
      this.poolChip.hidden = !inGame;
      this.btnSettings.hidden = mode === "none";
      this.btnSound.hidden = mode === "none";
      const soundOn = this.settings.music || this.settings.sfx;
      this.btnSound.replaceChildren(icon(soundOn ? "sound" : "mute"));
      if (this.game) { const v = doc.getElementById("pool-val"); if (v) v.textContent = this.game.state.prizePool; }
    },
    toggleSound() {
      const on = this.settings.music || this.settings.sfx;
      this.settings.music = !on; this.settings.sfx = !on;
      this.applySettings();
      if (!on) KF.Audio.play("click");
    },

    /* ---------- زر الرجوع (Back) ---------- */
    onBack() {
      try { root.history.pushState({ kf: 1 }, ""); } catch (e) {}
      if (KF.UI.hasLayer()) { KF.UI.closeTop(); return; }
      const id = this.current && this.current.id;
      if (id === "splash") return;
      if (this.current.ctrl && this.current.ctrl.onBack && this.current.ctrl.onBack()) return;
      if (this.game && ["main", "rps", "challenge"].includes(id)) { this.confirmExit(); return; }
      if (id === "results") { this.exitToStart(); return; }
      this.prev();
    },

    /* ---------- خروج ---------- */
    async confirmExit() {
      const v = await dialog({
        emoji: "🚪", title: "عايز تخرج؟", text: "لو خرجت التقدم في الجيم ده هيتمسح.",
        buttons: [
          { label: "🏁 خلّصنا وورّيني النتائج", cls: "yellow", value: "results" },
          { label: "خروج", cls: "red", value: "exit" },
          { label: "إلغاء", cls: "ghost", value: "cancel" },
        ],
      });
      if (v === "exit") this.exitToStart();
      else if (v === "results") this.endGame();
    },
    exitToStart() {
      this.game = null; this.savedGame = null; this.clearSession();
      this.go("splash");
    },
    endGame() {
      if (!this.game) return;
      this.game.endGame();
      this.clearSession();
      this.go("results");
    },

    /* ---------- Scoreboard ---------- */
    openScoreboard() {
      if (!this.game) return;
      const g = this.game;
      const rows = KF.Scoring.ranking(g.players);
      const list = h("div", { class: "sb-list" });
      rows.forEach(({ player: p, rank }) => {
        const scoreNum = h("span", null, String(this.lastScoreSnapshot[p.id] != null ? this.lastScoreSnapshot[p.id] : p.score));
        const score = h("div", { class: "sc" }, scoreNum, h("small", null, "نقطة"));
        list.append(h("div", { class: "sb-row" + (rank === 1 && p.score > 0 ? " first" : "") },
          h("div", { class: "rk" }, rank === 1 && p.score > 0 ? "🥇" : rank === 2 && p.score > 0 ? "🥈" : rank === 3 && p.score > 0 ? "🥉" : "#" + rank),
          avatar(p.avatarId, "sm"),
          h("div", { class: "grow" },
            h("div", { class: "nm" }, p.name),
            h("div", { class: "sub" },
              h("span", null, p.goldenCardAvailable ? "🃏 معاه الجولدن" : "🃏 اتستخدمت"),
              h("span", null, "✅ " + p.turnsCompleted + " دور"),
              p.hasCompletedCurrentRound ? h("span", null, "خلّص الدورة") : null)),
          score));
        KF.VFX.countUp(scoreNum, this.lastScoreSnapshot[p.id] != null ? this.lastScoreSnapshot[p.id] : 0, p.score, 600);
      });
      const pool = h("div", { class: "pool-banner" }, icon("coin"), h("span", null, `الصندوق: ${g.state.prizePool} ${C.money.currency}`));
      pool.querySelector("svg").style.cssText = "width:34px;height:34px";
      const endBtn = button("🏁 إنهاء اللعبة والنتائج", { cls: "yellow btn-block", onClick: async () => {
        const ok = await dialog({ emoji: "🏁", title: "نخلّص اللعبة؟", text: "هنعرض النتائج والجايزة.", buttons: [{ label: "أيوه خلّصنا", cls: "green", value: true }, { label: "لأ كمّل", cls: "ghost", value: false }] });
        if (ok) { KF.UI.closeAll(); this.endGame(); }
      } });
      const layer = sheet({ title: `🏆 النتائج — الدورة ${g.round}`, content: h("div", { class: "stack" }, pool, list, endBtn) });
      g.players.forEach((p) => { this.lastScoreSnapshot[p.id] = p.score; });
    },

    /* ---------- Settings ---------- */
    openSettings() {
      const S = this.settings;
      const toggle = (key, label, sub, after) => {
        const sw = h("button", { type: "button", class: "switch", role: "switch", "aria-checked": String(!!S[key]), "aria-label": label, "data-sfx": "click" });
        sw.addEventListener("click", () => {
          const v = sw.getAttribute("aria-checked") !== "true";
          sw.setAttribute("aria-checked", String(v));
          this.setSetting(key, v); after && after(v);
        });
        return h("div", { class: "set-row" }, h("div", { class: "lbl" }, label, sub ? h("small", null, sub) : null), sw);
      };
      const slider = (key, label) => {
        const input = h("input", { type: "range", class: "range", min: "0", max: "1", step: "0.05", value: String(S[key]), "aria-label": label });
        input.addEventListener("input", () => { this.setSetting(key, parseFloat(input.value)); });
        input.addEventListener("change", () => KF.Audio.play("score"));
        return h("div", { class: "set-row col" }, h("div", { class: "lbl" }, label), input);
      };
      const speechOk = KF.Speech.supported();
      const body = h("div", null,
        h("div", { class: "set-group" }, h("div", { class: "gt" }, "الصوت"),
          toggle("music", "🎵 الموسيقى"), slider("musicVolume", "مستوى الموسيقى"),
          toggle("sfx", "🔊 المؤثرات الصوتية"), slider("sfxVolume", "مستوى المؤثرات")),
        h("div", { class: "set-group" }, h("div", { class: "gt" }, "الجهاز"),
          toggle("haptics", "📳 الاهتزاز", "بيشتغل على الموبايلات اللي بتدعمه"),
          toggle("reducedEffects", "🐢 تأثيرات خفيفة", "لو الموبايل بطيء أو بتتضايق من الحركة"),
          toggle("voiceRecognition", "🎤 التعرف على الصوت", speechOk ? "لفتح اللعبة بصوتك" : "المتصفح ده مش بيدعمه (الكتابة شغالة)")),
        h("div", { class: "set-group" }, h("div", { class: "gt" }, "محتوى اللعبة"),
          toggle("enableBelt", "🥋 خيار وتحديات الحزام", "لو قفلته: بيختفي خيار الحزام والتحدي المرتبط بيه"),
          toggle("enableSpicy", "🌶️ تحدي الشطة", "بيشيل تحديات الأكل الحار")),
        h("div", { class: "set-group" }, h("div", { class: "gt" }, "أدوات"),
          this.game ? h("div", { style: { marginTop: "6px" } }, button("🗑️ مسح الجلسة الحالية", { cls: "red btn-block btn-sm", onClick: async () => {
            const ok = await dialog({ emoji: "🗑️", title: "نمسح الجيم؟", text: "كل النقاط والتقدم هيتمسحوا.", buttons: [{ label: "امسح", cls: "red", value: true }, { label: "إلغاء", cls: "ghost", value: false }] });
            if (ok) { KF.UI.closeAll(); this.exitToStart(); toast("اتمسح ✔"); }
          } })) : null,
          h("div", { style: { marginTop: "8px" } }, button("↩️ رجّع الإعدادات الافتراضية", { cls: "paper btn-block btn-sm", onClick: () => {
            this.settings = Object.assign({}, KF.DEFAULT_SETTINGS); this.applySettings(); KF.UI.closeAll(); toast("اتظبطت ✔");
          } }))),
        h("div", { class: "about-box card" }, h("div", { class: "display h3" }, C.game.name), h("div", { class: "credit" }, C.game.credit), h("div", { class: "tiny", style: { opacity: .7 } }, "v" + C.game.version)));
      sheet({ title: "⚙️ الإعدادات", content: body });
    },
  };

  KF.App = App;
})(typeof window !== "undefined" ? window : globalThis);
