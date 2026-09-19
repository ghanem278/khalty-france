/* ==========================================================================
   ESCAPES  —  وسائل الهروب. غيّر النقاط والوصف من هنا.
     id       : لازم يفضل زي ما هو (المنطق بيعتمد عليه)
     points   : النقاط اللي اللاعب بياخدها لما ينفذ الخيار
     money    : فلوس بتتضاف للصندوق (Prize Pool) — pay بس
     timer    : ثواني عدّاد مساعد (بلانك)
     special  : "golden" = يغيّر التحدي ومفيهاش نقاط
     flags    : ["belt"] يتقفل من الإعدادات
   ========================================================================== */
(function (root) {
  const KF = (root.KF = root.KF || {});
  KF.DATA = KF.DATA || {};

  KF.DATA.escapes = [
    { id: "pay",    icon: "💸", title: "ادفع ٥ جنيه", desc: "حط ٥ جنيه في الصندوق وخلاص هربت.", points: 3, money: 5, sfx: "money", color: "teal" },
    { id: "plank",  icon: "💪", title: "دقيقة بلانك", desc: "اثبت ٦٠ ثانية وإنت ماسك نفسك. (نفّذ فقط لو مناسب لك)", points: 4, timer: 60, sfx: "success", color: "orange", flags: ["physical"] },
    { id: "truth",  icon: "🤫", title: "سؤال صراحة", desc: "اللي جنبك يسألك أي سؤال وإنت لازم تجاوب بصدق.", points: 2, sfx: "success", color: "pink" },
    { id: "belt",   icon: "🥋", title: "٥ جلدات بحزام", desc: "خمس جلدات خفيفة بحزام… نقطة واحدة بس عشان محدش يختارها.", points: 1, sfx: "failure", color: "red", flags: ["belt", "physical"] },
    { id: "golden", icon: "🃏", title: "الجولدن كارد", desc: "بتغيّر التحدي بتاعك. ينفع مرة واحدة بس طول الجيم!", points: 0, special: "golden", sfx: "goldenCard", color: "gold" },
  ];

  if (typeof module !== "undefined") module.exports = KF.DATA.escapes;
})(typeof window !== "undefined" ? window : globalThis);
