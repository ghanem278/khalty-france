/* ==========================================================================
   CONFIG  —  كل الحاجات اللي ممكن تعدلها بسهولة في مكان واحد.
   (شغال في المتصفح وفي الـ Service Worker وفي الاختبارات)
   ========================================================================== */
(function (root) {
  const KF = (root.KF = root.KF || {});

  KF.CONFIG = {
    game: {
      name: "خالتي فرنسا",
      tagline: "لعبة تحديات القعدات",
      credit: "A game by Ghanem & Rody",
      version: "1.0.0",
    },

    /* ترتيب الشاشات في أول اللعبة. غيّر الترتيب لو عايز الباسورد قبل الشروط مثلًا:
       ["splash", "password", "terms", "setup"] */
    flow: ["splash", "terms", "password", "setup"],

    players: { min: 2, max: 10, nameMaxLength: 14 },

    password: {
      /* أي كلمة من دول تفتح اللعبة (بعد تنظيف الحروف والتشكيل) */
      answers: ["يوم ورا يوم", "يوم وراء يوم"],
      hintAfterFails: 3,
      hint: "تلميح: أفيه مشهور من فيلم قديم لهنيدي 🎬",
    },

    /* نقاط تنفيذ التحدي العادي (كل تحدي ممكن يكون له points خاصة في data/challenges.js) */
    points: { challenge: 5 },

    money: { currency: "جنيه" },

    /* الجايزة: اللي معاه أعلى نقاط ومستخدمش الجولدن كارد بيتحسب كأنه فردين */
    prize: { noGoldenMultiplier: 2 },

    timers: {
      challengeTimeoutSec: 70,   // بعدها يظهر إفيه "انطق والا سأشرحنك"
      timeoutRepeat: true,       // يكرر التذكير كل 70 ثانية تاني
      warningSec: 5,             // تحذير العدّاد في آخر كام ثانية
    },

    wheel: {
      spinMs: [5200, 6600],      // مدة اللف (أقل، أكبر) بالمللي ثانية
      extraTurns: [5, 8],        // عدد اللفّات الكاملة
      jitter: 0.28,              // عشوائية مكان الوقوف جوه القطعة (0 = في النص بالظبط)
    },

    rps: {
      countdownSteps: 3,
      revealHoldMs: 1900,
      drawRestartMs: 1900,
    },

    /* ميزان العدالة في اختيار اللاعبين */
    fairness: {
      recentPenalty: 0.3,        // اللي ظهر في اللفة اللي فاتت فرصته تقل
      idleBoostPerSpin: 0.35,    // اللي غايب بقاله لفات فرصته تزيد
      idleBoostMax: 3,
      pairRepeatPenalty: 1.2,    // منع تكرار نفس الاتنين ورا بعض
    },

    /* التخطي بدون نقاط (زر تعدّي) */
    allowSkipChallenge: true,

    /* الصوت */
    audio: {
      musicVolume: 0.45,
      sfxVolume: 0.9,
      voiceVolume: 1,
      /* ضع الملفات في المسارات دي وهتشتغل تلقائي. لو الملف مش موجود اللعبة بتستخدم صوت مولّد بديل (SFX/موسيقى فقط) */
      music: { bg: "audio/music/background.mp3" },
      sfx: {
        click: "audio/sfx/click.mp3",
        press: "audio/sfx/press.mp3",
        wheelSpin: "audio/sfx/wheel-spin.mp3",
        wheelTick: "audio/sfx/wheel-tick.mp3",
        wheelStop: "audio/sfx/wheel-stop.mp3",
        playerSelected: "audio/sfx/player-selected.mp3",
        rpsCountdown: "audio/sfx/rps-countdown.mp3",
        rpsReveal: "audio/sfx/rps-reveal.mp3",
        win: "audio/sfx/win.mp3",
        lose: "audio/sfx/lose.mp3",
        draw: "audio/sfx/draw.mp3",
        challengeReveal: "audio/sfx/challenge-reveal.mp3",
        success: "audio/sfx/success.mp3",
        failure: "audio/sfx/failure.mp3",
        goldenCard: "audio/sfx/golden-card.mp3",
        money: "audio/sfx/money.mp3",
        score: "audio/sfx/score.mp3",
        timerWarning: "audio/sfx/timer-warning.mp3",
        timerEnd: "audio/sfx/timer-end.mp3",
        modal: "audio/sfx/modal.mp3",
        error: "audio/sfx/error.mp3",
      },
      /* الأصوات المسجلة (بتاعتك انت) — مفيش توليد صوت بشري في اللعبة */
      voices: {
        passwordSong: "audio/voices/password-1-habibi.mp3",   // حبيبي ما جالي نوم حبيبي ما جالي نوم حبيبي
        passwordOmar: "audio/voices/password-2-ana-omar.mp3", // انا عمر
        passwordReply: "audio/voices/password-3-reply.mp3",   // ايه يا وحش احنا هنقضبها مغنى طول اليوم
        khaltyTimeout: "audio/voices/khalty-antoq.mp3",       // انطق والا سأشرحنك
      },
    },

    /* شاشة نجاح الباسورد: النص بيظهر كترجمة مع كل صوت (حتى لو الملف لسه مش موجود) */
    passwordSequence: [
      { voice: "passwordSong",  caption: "حبيبي ما جالي نوم.. حبيبي ما جالي نوم حبيبي🎶", holdMs: 4000 },
      { voice: "passwordOmar",  caption: "أنا عُمري ما كنت بغيييييييير عيونك عايشه جوااااااااااااااايا خلاص  يوم ورا يوم", holdMs: 13000 },
      { voice: "passwordReply", caption: "خلااص يا وحش بقا! احنا هنقضّبها مغنى طول الليل اخرس بقا😂", holdMs: 5000 },
    ],

    timeoutLine: "انطق والا سأشرحنك!",

    /* ملفات إضافية بتتحمل للأوفلاين (الـ Service Worker بيقراها من هنا) */
    storageKeys: { session: "kf.v1.session", settings: "kf.v1.settings" },
  };

  /* الإعدادات الافتراضية للاعب (بتتحفظ في الجهاز) */
  KF.DEFAULT_SETTINGS = {
    music: true,
    sfx: true,
    voiceRecognition: true,
    haptics: true,
    reducedEffects: false,
    enableBelt: true,       // خيار + تحديات "5 جلدات بحزام"
    enableSpicy: true,      // تحدي الشطة
    musicVolume: 0.45,
    sfxVolume: 0.9,
  };

  if (typeof module !== "undefined") module.exports = KF.CONFIG;
})(typeof window !== "undefined" ? window : globalThis);
