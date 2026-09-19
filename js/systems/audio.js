/* Audio Manager
   - كل صوت له اسم (key) وملف في config.js. استبدل الملف بس وخلاص.
   - لو الملف مش موجود: الـSFX والموسيقى بيشتغلوا بصوت مولّد (WebAudio) عشان اللعبة تفضل حية.
   - الأصوات البشرية (voices) عمرها ما بتتولّد: لو الملف مش موجود بتتخطى بهدوء وتظهر الترجمة بس.
*/
(function (root) {
  const KF = (root.KF = root.KF || {});

  const A = {
    ctx: null, master: null, sfxGain: null, musicGain: null, voiceGain: null,
    settings: { music: true, sfx: true, musicVolume: 0.45, sfxVolume: 0.9 },
    files: { sfx: {}, voices: {}, music: {} },   // key → { el, status: "loading"|"ok"|"missing" }
    musicWanted: false,
    unlocked: false,
    _musicEl: null,
    _synthMusic: { timer: null, step: 0, nextTime: 0, playing: false },
    _voiceEl: null,
    _lastTickAt: 0,

    /* ---------- تجهيز ---------- */
    init(settings) {
      Object.assign(this.settings, settings || {});
      const cfg = KF.CONFIG.audio;
      const make = (group, map) => {
        Object.keys(map).forEach((key) => {
          const entry = { el: null, status: "loading", url: map[key] };
          this.files[group][key] = entry;
          try {
            const el = new root.Audio();
            el.preload = "auto";
            el.addEventListener("canplaythrough", () => { entry.status = "ok"; }, { once: true });
            el.addEventListener("loadeddata", () => { if (entry.status === "loading") entry.status = "ok"; }, { once: true });
            el.addEventListener("error", () => { entry.status = "missing"; });
            el.src = entry.url;
            el.load();
            entry.el = el;
          } catch (e) { entry.status = "missing"; }
        });
      };
      make("sfx", cfg.sfx); make("voices", cfg.voices); make("music", cfg.music);
    },

    _ensureCtx() {
      if (this.ctx) return this.ctx;
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 1; this.master.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
        this.voiceGain = this.ctx.createGain(); this.voiceGain.connect(this.master);
        this._applyVolumes();
      } catch (e) { this.ctx = null; }
      return this.ctx;
    },

    /* لازم يتنادى من أول لمسة (سياسة المتصفحات) */
    unlock() {
      const ctx = this._ensureCtx();
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      this.unlocked = true;
      if (this.musicWanted) this.startMusic();
    },

    _applyVolumes() {
      const s = this.settings;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // الموسيقى دايمًا أوطى من المؤثرات
      this.musicGain.gain.setTargetAtTime(s.music ? s.musicVolume * 0.55 : 0, t, 0.05);
      this.sfxGain.gain.setTargetAtTime(s.sfx ? s.sfxVolume : 0, t, 0.02);
      this.voiceGain.gain.setTargetAtTime(s.sfx ? 1 : 0, t, 0.02);
      if (this._musicEl) this._musicEl.volume = s.music ? Math.min(1, s.musicVolume * 0.5) : 0;
    },

    configure(patch) {
      Object.assign(this.settings, patch);
      this._applyVolumes();
      if ("music" in patch) { patch.music ? this.startMusic() : this.pauseMusic(); }
      if (this._voiceEl) this._voiceEl.volume = this.settings.sfx ? 1 : 0;
    },

    /* ---------- تشغيل مؤثر ---------- */
    play(key, opts) {
      if (!this.settings.sfx) return;
      const entry = this.files.sfx[key];
      if (entry && entry.status === "ok" && entry.el) {
        try {
          const el = entry.el.cloneNode();
          el.volume = Math.min(1, this.settings.sfxVolume * ((opts && opts.volume) || 1));
          if (opts && opts.rate) el.playbackRate = opts.rate;
          const p = el.play(); if (p && p.catch) p.catch(() => {});
          return;
        } catch (e) { /* نكمل للصوت البديل */ }
      }
      this._synth(key, opts);
    },

    hasFile(group, key) { const e = this.files[group][key]; return !!(e && e.status === "ok"); },

    /* صوت مسجل (تعليق). بيرجع Promise بتخلص لما الصوت يخلص، أو على طول لو الملف مش موجود */
    playVoice(key, { maxMs = 12000 } = {}) {
      return new Promise((resolve) => {
        const entry = this.files.voices[key];
        if (!this.settings.sfx || !entry || entry.status !== "ok") return resolve(false);
        try {
          this.stopVoice();
          const el = entry.el.cloneNode();
          el.volume = 1;
          this._voiceEl = el;
          let settled = false;
          const done = (v) => { if (!settled) { settled = true; resolve(v); } };
          el.addEventListener("ended", () => done(true), { once: true });
          el.addEventListener("error", () => done(false), { once: true });
          setTimeout(() => done(true), maxMs);
          const p = el.play(); if (p && p.catch) p.catch(() => done(false));
        } catch (e) { resolve(false); }
      });
    },
    stopVoice() { try { if (this._voiceEl) { this._voiceEl.pause(); this._voiceEl = null; } } catch (e) {} },

    /* ---------- الموسيقى ---------- */
    startMusic() {
      this.musicWanted = true;
      if (!this.unlocked || !this.settings.music) return;
      const f = this.files.music.bg;
      if (f && f.status === "ok" && f.el) {
        this._stopSynthMusic();
        try {
          if (!this._musicEl) { this._musicEl = f.el; this._musicEl.loop = true; }
          this._musicEl.volume = Math.min(1, this.settings.musicVolume * 0.5);
          const p = this._musicEl.play(); if (p && p.catch) p.catch(() => {});
        } catch (e) { this._startSynthMusic(); }
      } else {
        this._startSynthMusic();
      }
    },
    pauseMusic() {
      try { if (this._musicEl) this._musicEl.pause(); } catch (e) {}
      this._stopSynthMusic();
    },
    suspend() { try { if (this.ctx && this.ctx.state === "running") this.ctx.suspend(); if (this._musicEl) this._musicEl.pause(); } catch (e) {} },
    resume() {
      try { if (this.ctx && this.ctx.state === "suspended" && this.unlocked) this.ctx.resume(); } catch (e) {}
      if (this.musicWanted && this.settings.music && this._musicEl) { const p = this._musicEl.play(); if (p && p.catch) p.catch(() => {}); }
    },
    /* أوطّي الموسيقى مؤقتًا (مثلًا وقت الأصوات المسجلة) */
    duck(on) {
      if (!this.ctx) return;
      const s = this.settings, t = this.ctx.currentTime;
      this.musicGain.gain.setTargetAtTime(s.music ? s.musicVolume * 0.55 * (on ? 0.2 : 1) : 0, t, 0.1);
      if (this._musicEl) this._musicEl.volume = s.music ? Math.min(1, s.musicVolume * 0.5 * (on ? 0.2 : 1)) : 0;
    },

    /* ==================== صوت مولّد (بديل لحد ما تحط ملفاتك) ==================== */
    _tone(freq, dur, { type = "sine", vol = 0.25, slide = null, delay = 0, attack = 0.005, dest = null } = {}) {
      const ctx = this.ctx; if (!ctx) return;
      const t0 = ctx.currentTime + delay;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(dest || this.sfxGain);
      o.start(t0); o.stop(t0 + dur + 0.03);
    },
    _noise(dur, { vol = 0.2, filter = "highpass", freq = 4000, delay = 0, q = 1, dest = null, sweepTo = null } = {}) {
      const ctx = this.ctx; if (!ctx) return;
      const t0 = ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
      src.start(t0); src.stop(t0 + dur + 0.02);
    },

    _synth(key, opts) {
      const ctx = this._ensureCtx(); if (!ctx || ctx.state === "closed") return;
      if (ctx.state === "suspended" && this.unlocked) ctx.resume().catch(() => {});
      const T = (f, d, o) => this._tone(f, d, o);
      const N = (d, o) => this._noise(d, o);
      const note = (n) => 440 * Math.pow(2, (n - 69) / 12);
      switch (key) {
        case "click":  T(880, 0.05, { type: "square", vol: 0.08 }); break;
        case "press":  T(220, 0.08, { type: "triangle", vol: 0.22, slide: 120 }); N(0.03, { vol: 0.05, freq: 3000 }); break;
        case "modal":  N(0.18, { filter: "bandpass", freq: 600, sweepTo: 2600, vol: 0.09, q: 2 }); T(520, 0.12, { type: "sine", vol: 0.08, slide: 780 }); break;
        case "wheelTick": {
          const r = (opts && opts.rate) || 1;
          T(1500 * r, 0.03, { type: "square", vol: 0.07 }); N(0.02, { vol: 0.06, freq: 5000 });
          break;
        }
        case "wheelSpin": N(0.6, { filter: "bandpass", freq: 300, sweepTo: 1800, vol: 0.12, q: 1.2 }); break;
        case "wheelStop": T(140, 0.35, { type: "sine", vol: 0.4, slide: 55 }); N(0.12, { vol: 0.15, freq: 1200 }); [784, 988, 1175].forEach((f, i) => T(f, 0.3, { type: "triangle", vol: 0.14, delay: 0.08 + i * 0.07 })); break;
        case "playerSelected": [660, 880, 1320].forEach((f, i) => T(f, 0.16, { type: "triangle", vol: 0.16, delay: i * 0.06 })); break;
        case "rpsCountdown": T(660, 0.12, { type: "square", vol: 0.14 }); break;
        case "rpsReveal": T(90, 0.3, { type: "sine", vol: 0.5, slide: 40 }); N(0.2, { vol: 0.25, freq: 800, filter: "lowpass", sweepTo: 200 }); T(1200, 0.05, { type: "square", vol: 0.1, delay: 0.02 }); break;
        case "win":    [523, 659, 784, 1047].forEach((f, i) => T(f, 0.22, { type: "square", vol: 0.11, delay: i * 0.09 })); T(1319, 0.5, { type: "triangle", vol: 0.16, delay: 0.4 }); break;
        case "lose":   [392, 370, 349, 294].forEach((f, i) => T(f, 0.28, { type: "sawtooth", vol: 0.1, delay: i * 0.16, slide: f * 0.92 })); break;
        case "draw":   T(440, 0.14, { type: "triangle", vol: 0.16 }); T(440, 0.14, { type: "triangle", vol: 0.16, delay: 0.18 }); break;
        case "challengeReveal": for (let i = 0; i < 10; i++) N(0.05, { vol: 0.09, freq: 1800, delay: i * 0.05 }); T(120, 0.5, { type: "sine", vol: 0.5, slide: 45, delay: 0.55 }); T(880, 0.4, { type: "square", vol: 0.1, delay: 0.55 }); T(1175, 0.5, { type: "triangle", vol: 0.14, delay: 0.62 }); break;
        case "success": [523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.16, { type: "square", vol: 0.1, delay: i * 0.07 })); N(0.25, { vol: 0.08, freq: 6000, delay: 0.3 }); break;
        case "failure": T(200, 0.4, { type: "sawtooth", vol: 0.2, slide: 90 }); T(150, 0.4, { type: "square", vol: 0.1, slide: 70, delay: 0.05 }); break;
        case "error":  T(180, 0.12, { type: "square", vol: 0.16 }); T(140, 0.18, { type: "square", vol: 0.16, delay: 0.13 }); break;
        case "goldenCard": for (let i = 0; i < 9; i++) T(note(84 + (i % 5) * 2), 0.25, { type: "sine", vol: 0.11, delay: i * 0.06 }); N(0.6, { filter: "highpass", freq: 5000, vol: 0.07 }); break;
        case "money": [1568, 2093, 1760].forEach((f, i) => T(f, 0.12, { type: "triangle", vol: 0.13, delay: i * 0.07 })); N(0.05, { vol: 0.08, freq: 7000, delay: 0.02 }); break;
        case "score": T(660, 0.08, { type: "square", vol: 0.1 }); T(990, 0.14, { type: "square", vol: 0.1, delay: 0.07 }); break;
        case "timerWarning": T(1000, 0.09, { type: "square", vol: 0.14 }); break;
        case "timerEnd": [880, 880, 880].forEach((f, i) => T(f, 0.16, { type: "square", vol: 0.16, delay: i * 0.2 })); T(1320, 0.5, { type: "square", vol: 0.16, delay: 0.62 }); break;
        case "timeout": // صفارة الإنذار الكوميدية لما التحدي يطوّل
          for (let i = 0; i < 4; i++) { T(700, 0.22, { type: "sawtooth", vol: 0.13, slide: 1100, delay: i * 0.24 }); }
          break;
        default: T(600, 0.06, { type: "sine", vol: 0.1 });
      }
    },

    /* تكّة العجلة: بتتنادى من حلقة الأنيميشن. speed = درجة/فريم. بتنزل حدة الصوت وهي بتبطّأ */
    tick(speedDegPerFrame) {
      if (!this.settings.sfx) return;
      const now = performance.now();
      if (now - this._lastTickAt < 28) return;
      this._lastTickAt = now;
      const rate = 0.7 + Math.min(1, speedDegPerFrame / 14) * 0.55;
      this.play("wheelTick", { rate, volume: 0.7 });
    },

    /* ==================== موسيقى مولّدة (Hijaz party loop) ==================== */
    _startSynthMusic() {
      const ctx = this._ensureCtx(); if (!ctx) return;
      const m = this._synthMusic;
      if (m.playing) return;
      m.playing = true; m.step = 0; m.nextTime = ctx.currentTime + 0.1;
      const tick = () => { if (!m.playing) return; this._scheduleMusic(); };
      m.timer = root.setInterval(tick, 60);
      tick();
    },
    _stopSynthMusic() {
      const m = this._synthMusic;
      m.playing = false;
      if (m.timer) { root.clearInterval(m.timer); m.timer = null; }
    },
    _scheduleMusic() {
      const ctx = this.ctx, m = this._synthMusic;
      if (!ctx || ctx.state !== "running") { m.nextTime = ctx ? ctx.currentTime + 0.1 : 0; return; }
      const bpm = 112, stepDur = 60 / bpm / 4;           // ستة عشر
      const hijaz = [0, 1, 4, 5, 7, 8, 10, 12];
      const root0 = 50;                                   // D3
      const dest = this.musicGain;
      const N = (d, o) => this._noise(d, Object.assign({ dest }, o));
      const T = (f, d, o) => this._tone(f, d, Object.assign({ dest }, o));
      const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
      while (m.nextTime < ctx.currentTime + 0.25) {
        const s = m.step % 64, bar = Math.floor(s / 16), st = s % 16;
        const delay = Math.max(0, m.nextTime - ctx.currentTime);
        // إيقاع مقسوم (دُم تك _ تك دُم _ تك _)
        const dum = [0, 4, 8, 11].includes(st), tek = [2, 6, 10, 14].includes(st);
        if (dum) { T(midi(root0 - 12), 0.18, { type: "sine", vol: 0.5, slide: midi(root0 - 24), delay }); }
        if (tek) { N(0.05, { vol: 0.16, freq: 4500, delay }); }
        if (st % 2 === 1) N(0.02, { vol: 0.05, freq: 8000, delay });
        // باص
        const bassPattern = [0, 0, 7, 5][bar];
        if ([0, 3, 6, 8, 11, 14].includes(st)) T(midi(root0 - 12 + bassPattern), 0.22, { type: "triangle", vol: 0.32, delay });
        // لحن (أرباع من السلم الحجازي)
        const melody = [
          [0, null, 4, 5, 4, null, 1, 0, null, 4, 5, 7, 5, 4, 1, null],
          [7, null, 5, 4, 5, null, 8, 7, null, 5, 4, 1, 4, 5, 4, null],
          [0, 4, 7, 5, 4, null, 5, 4, 1, 0, null, 1, 4, 5, null, null],
          [7, 5, 4, 1, 0, null, 1, 4, 5, null, 7, 8, 7, 5, 4, null],
        ][bar][st];
        if (melody !== null && melody !== undefined) T(midi(root0 + 24 + hijaz[melody % hijaz.length]), 0.16, { type: "square", vol: 0.09, delay });
        // ضربة "بن" خفيفة على أول كل مازورة
        if (st === 0) T(midi(root0 + 12), 0.4, { type: "sawtooth", vol: 0.06, delay });
        m.nextTime += stepDur; m.step++;
      }
    },
  };

  KF.Audio = A;
})(typeof window !== "undefined" ? window : globalThis);
