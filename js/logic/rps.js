/* RPS Logic */
(function (root) {
  const KF = (root.KF = root.KF || {});
  const CHOICES = ["rock", "paper", "scissors"];
  const BEATS = { rock: "scissors", scissors: "paper", paper: "rock" };
  const META = {
    rock:     { emoji: "✊", label: "حجر" },
    paper:    { emoji: "✋", label: "ورقة" },
    scissors: { emoji: "✌️", label: "مقص" },
  };
  function isValid(c) { return CHOICES.includes(c); }
  /* بيرجع "a" لو الأول كسب، "b" لو التاني، "draw" لو تعادل */
  function resolve(a, b) {
    if (!isValid(a) || !isValid(b)) throw new Error("اختيار غير صالح");
    if (a === b) return "draw";
    return BEATS[a] === b ? "a" : "b";
  }
  KF.RPS = { CHOICES, META, isValid, resolve };
  if (typeof module !== "undefined") module.exports = KF.RPS;
})(typeof window !== "undefined" ? window : globalThis);
