/* ==========================================================================
   AVATARS  —  الأفاتارات (ستيكرز على طريقة الواتساب).
   لإضافة أفاتار جديد: أضف سطر. اتنين أنواع:
     { id: "x", emoji: "😎", bg: "#ffd23f", label: "..." }          ← ستيكر إيموجي
     { id: "y", image: "assets/avatars/y.webp", bg: "#fff", label: "..." } ← صورة ستيكر (webp/png شفاف)
   ========================================================================== */
(function (root) {
  const KF = (root.KF = root.KF || {});
  KF.DATA = KF.DATA || {};

  KF.DATA.avatars = [
    { id: "a01", emoji: "😎", bg: "#ffd23f", label: "الجامد" },
    { id: "a02", emoji: "🤪", bg: "#ff8fd0", label: "المجنون" },
    { id: "a03", emoji: "😂", bg: "#14c9b4", label: "الضحك" },
    { id: "a04", emoji: "🥸", bg: "#ff9f1c", label: "المتنكر" },
    { id: "a05", emoji: "🤠", bg: "#c98a4b", label: "الكاوبوي" },
    { id: "a06", emoji: "🥳", bg: "#7c4dff", label: "الحفلة" },
    { id: "a07", emoji: "😈", bg: "#ff4b3e", label: "الشيطان" },
    { id: "a08", emoji: "🤡", bg: "#4fd15f", label: "المهرج" },
    { id: "a09", emoji: "👽", bg: "#b6e21f", label: "الفضائي" },
    { id: "a10", emoji: "🤖", bg: "#2f8cff", label: "الروبوت" },
    { id: "a11", emoji: "🐵", bg: "#e6a15a", label: "القرد" },
    { id: "a12", emoji: "🐸", bg: "#62d26f", label: "الضفدع" },
    { id: "a13", emoji: "🦁", bg: "#ffb703", label: "الأسد" },
    { id: "a14", emoji: "🐼", bg: "#e8e8f5", label: "الباندا" },
    { id: "a15", emoji: "🦄", bg: "#ff8fd0", label: "اليونيكورن" },
    { id: "a16", emoji: "🐔", bg: "#ff7a1a", label: "الفرخة" },
    { id: "a17", emoji: "🥷", bg: "#6a5a9a", label: "النينجا" },
    { id: "a18", emoji: "🧞", bg: "#14c9b4", label: "العفريت" },
    { id: "a19", emoji: "👻", bg: "#dcd6ff", label: "الشبح" },
    { id: "a20", emoji: "💩", bg: "#a8743a", label: "اليعععع" },
    { id: "a21", emoji: "🔥", bg: "#ff5c5c", label: "النار" },
    { id: "a22", emoji: "🍕", bg: "#ffd23f", label: "البيتزا" },
    { id: "a23", emoji: "🥔", bg: "#d9a441", label: "البطاطس" },
    { id: "a24", emoji: "🌶️", bg: "#ff4b3e", label: "الشطة" },
  ];

  if (typeof module !== "undefined") module.exports = KF.DATA.avatars;
})(typeof window !== "undefined" ? window : globalThis);
