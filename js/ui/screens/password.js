/* Password — كلمة السر (كتابة أو صوت) + مشهد النجاح بالترجمة */
(function (root) {
  const KF = root.KF, { h, button, icon, wait } = KF.UI, C = KF.CONFIG;

  KF.App.register("password", {
    meta: { chrome: "minimal" },
    mount(el, params, app) {
      el.classList.add("pw-screen");
      let fails = 0, listening = false, unlocking = false, alive = true;

      // تشغيل ملف الصوت مباشرة عن طريق عنصر Audio لتفادي مشاكل الـ Config والـ AudioContext
      const enterAudio = new Audio("audio/voices/password-enter.mp3");
      
      const playEnterVoice = () => {
        if (!alive) return;
        enterAudio.play().catch(() => {
          // في حالة حظر المتصفح للـ Autoplay يتم تشغيله فور أول لمسة للمستخدم
          const onUserInteraction = () => {
            if (alive && !unlocking) {
              enterAudio.play().catch(() => {});
            }
            root.removeEventListener("click", onUserInteraction);
            root.removeEventListener("touchstart", onUserInteraction);
          };
          root.addEventListener("click", onUserInteraction, { once: true });
          root.addEventListener("touchstart", onUserInteraction, { once: true });
        });
      };

      // تشغيل الصوت فور فتح الشاشة
      playEnterVoice();

      const lock = h("div", { class: "lock-icon" }, "🔒");
      const title = h("div", { class: "display h1", style: { color: "var(--accent)", WebkitTextStroke: "6px var(--ink)", paintOrder: "stroke fill", textShadow: "0 5px 0 var(--ink)" } }, "أنطق كلمة السر");
      const sub = h("p", { class: "muted", style: { fontWeight: 700 } }, "اكتبها أو قولها بصوتك عشان تفتح اللعبة");
      const input = h("input", { class: "field", type: "text", placeholder: "اكتب كلمة السر هنا", dir: "rtl", autocomplete: "off", autocapitalize: "off", spellcheck: "false", enterkeyhint: "go", "aria-label": "كلمة السر" });
      const hint = h("div", { class: "pw-hint", "aria-live": "polite" });
      const heard = h("div", { class: "muted tiny", style: { minHeight: "20px" }, "aria-live": "polite" });

      const speechOn = KF.Speech.supported() && app.settings.voiceRecognition;
      const mic = h("button", { type: "button", class: "mic-btn", "aria-label": "قول كلمة السر بصوتك", "data-sfx": "click" }, icon("mic"));

      const check = (alts, src) => {
        if (unlocking) return;
        const ok = KF.Speech.matches(alts, C.password.answers, { fuzzy: src === "voice" });
        if (ok) return unlock();
        fails++;
        KF.Audio.play("error"); KF.Haptics.buzz("fail");
        input.classList.remove("invalid"); void input.offsetWidth; input.classList.add("invalid");
        KF.VFX.shake(el.querySelector(".lock-icon"), 1);
        const msgs = ["غلط! فكّر شوية 🤔", "لأ لأ لأ 🙅", "قربت.. بس لأ 😅", "الباب لسه مقفول 🔒"];
        hint.textContent = fails >= C.password.hintAfterFails ? C.password.hint : msgs[(fails - 1) % msgs.length];
      };

      const submit = () => { const v = input.value.trim(); if (v) check([v], "text"); else { KF.Audio.play("error"); input.classList.add("invalid"); setTimeout(() => input.classList.remove("invalid"), 450); } };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
      input.addEventListener("input", () => input.classList.remove("invalid"));

      const stopListen = () => { listening = false; mic.classList.remove("listening"); KF.Speech.stop(); };
      mic.addEventListener("click", () => {
        if (unlocking) return;
        if (listening) { stopListen(); return; }
        listening = true; mic.classList.add("listening"); heard.textContent = "بسمعك… قول الكلمة 🎧";
        KF.Speech.listen({
          onInterim: (t) => { if (alive) heard.textContent = "سمعت: " + t; },
          onFinal: (alts) => { if (!alive) return; heard.textContent = "سمعت: " + alts[0]; check(alts, "voice"); },
          onError: (kind) => {
            if (!alive) return;
            const m = { "not-allowed": "المايك مش مسموح — اكتب الكلمة بدل كده ⌨️", "service-not-allowed": "المايك مش مسموح — اكتب الكلمة ⌨️", network: "التعرف على الصوت محتاج إنترنت — اكتب الكلمة ⌨️", "no-speech": "مسمعتش حاجة، جرّب تاني 🎤", "audio-capture": "مفيش مايك شغال ⌨️" };
            heard.textContent = m[kind] || "مقدرتش أسمعك — اكتب الكلمة ⌨️";
          },
          onEnd: () => { listening = false; mic.classList.remove("listening"); },
        });
      });

      /* مشهد النجاح: ترجمة + صوت (لو الملف موجود) ثم فتح اللعبة */
      async function unlock() {
        unlocking = true; stopListen();
        enterAudio.pause(); // إيقاف صوت الدخول عند فتح القفل
        input.blur();
        lock.textContent = "🔓"; lock.classList.add("open");
        KF.Audio.play("success"); KF.Haptics.buzz("success");
        KF.VFX.confetti({ count: 80 });
        await wait(650);
        if (!alive) return;
        const cap = h("div", { class: "pw-caption" }, h("div", { class: "cap" }));
        el.append(cap);
        KF.Audio.duck(true);
        for (const step of C.passwordSequence) {
          if (!alive) return;
          const capEl = h("div", { class: "cap" }, step.caption);
          cap.replaceChildren(capEl);
          KF.Haptics.buzz("select");
          const started = performance.now();
          const played = await KF.Audio.playVoice(step.voice);
          const spent = performance.now() - started;
          if (!played || spent < 500) await wait(step.holdMs);
          else await wait(250);
        }
        KF.Audio.duck(false);
        if (!alive) return;
        KF.VFX.flash("#ffd23f", 500, 0.7);
        app.next();
      }

      el.append(lock, title, sub,
        h("div", { class: "stack", style: { width: "100%" } }, input, hint),
        speechOn ? h("div", { class: "stack", style: { alignItems: "center", gap: "8px" } }, mic, heard) : null,
        button("افتح", { cls: "btn-lg btn-block", icon: "check", onClick: submit }),
        button("رجوع", { cls: "ghost btn-sm", onClick: () => app.prev(), sfx: "click" }));
      root.setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) {} }, 700);

      return { 
        destroy() { 
          alive = false; 
          stopListen(); 
          enterAudio.pause();
          KF.Audio.stopVoice(); 
          KF.Audio.duck(false); 
        } 
      };
    },
  });
})(typeof window !== "undefined" ? window : globalThis);