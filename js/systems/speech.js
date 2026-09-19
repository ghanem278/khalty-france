/* Speech — التعرف على الصوت للباسورد (Web Speech API). لو مش مدعوم بيرجع unsupported وتفضل الكتابة شغالة.
   ملحوظة: Chrome بيحتاج إنترنت + HTTPS للتعرف على الصوت، فهو الجزء الوحيد اللي مش أوفلاين. */
(function (root) {
  const KF = (root.KF = root.KF || {});
  const SR = root.SpeechRecognition || root.webkitSpeechRecognition;

  const Speech = {
    supported() { return !!SR; },
    _rec: null,
    /* بيبدأ الاستماع. callbacks: onInterim(text), onFinal(alternatives[]), onError(kind), onEnd() */
    listen({ onInterim, onFinal, onError, onEnd }) {
      if (!SR) { onError && onError("unsupported"); onEnd && onEnd(); return null; }
      this.stop();
      let done = false;
      const finish = () => { if (!done) { done = true; onEnd && onEnd(); } };
      try {
        const rec = new SR();
        rec.lang = "ar-EG";
        rec.interimResults = true;
        rec.maxAlternatives = 5;
        rec.continuous = false;
        rec.onresult = (ev) => {
          const res = ev.results[ev.results.length - 1];
          const alts = Array.from(res).map((a) => a.transcript);
          if (res.isFinal) onFinal && onFinal(alts);
          else onInterim && onInterim(alts[0] || "");
        };
        rec.onerror = (ev) => { onError && onError(ev.error || "error"); finish(); };
        rec.onend = finish;
        rec.start();
        this._rec = rec;
        return rec;
      } catch (e) {
        onError && onError("start-failed"); finish(); return null;
      }
    },
    stop() {
      try { if (this._rec) { this._rec.onend = null; this._rec.abort(); } } catch (e) {}
      this._rec = null;
    },
    /* هل أي بديل من اللي سمعناه يطابق الباسورد؟ (بنسمح بغلطة حرف واحد للتعرف الصوتي) */
    matches(alternatives, answers, { fuzzy = false } = {}) {
      const U = KF.utils;
      const targets = answers.map(U.normalizeArabic);
      return alternatives.some((alt) => {
        const n = U.normalizeArabic(alt);
        if (!n) return false;
        return targets.some((t) => n === t || n.includes(t) || (fuzzy && U.levenshtein(n, t) <= 2));
      });
    },
  };
  KF.Speech = Speech;
})(typeof window !== "undefined" ? window : globalThis);
