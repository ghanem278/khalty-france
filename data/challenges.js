/* ==========================================================================
   CHALLENGES  —  التحديات. لإضافة تحدي جديد: انسخ سطر وغيّر الـ text بس.

   الحقول (كلها اختيارية ما عدا text):
     id         : رقم تعريف فريد (لو نسيته، اللعبة بتعمله لوحدها)
     text       : نص التحدي (بيظهر زي ما هو)
     category   : singing | acting | social | phone | embarrassing | physical | truth | special | random
     points     : نقاط التحدي (الافتراضي 5 من config.js)
     duration   : مدة بالثواني → بيظهر عدّاد للتحدي
     difficulty : 1 سهل .. 3 صعب
     type       : "normal" أو "escapeLike"
     flags      : ["physical"] تنبيه أمان | ["external"] تحدي بره اللعبة (مكالمة/رسالة/بوست)
                  ["belt"] و ["spicy"] بيتقفلوا من الإعدادات

   ملحوظة: مفيش حد بيتنفذ تلقائي — اللعبة بتعرض التحدي واللاعب هو اللي بيأكد.
   ========================================================================== */
(function (root) {
  const KF = (root.KF = root.KF || {});
  KF.DATA = KF.DATA || {};

  KF.DATA.categories = {
    singing:      { label: "غنا",       icon: "🎤" },
    acting:       { label: "تمثيل",     icon: "🎭" },
    social:       { label: "مع القعدة", icon: "🫂" },
    phone:        { label: "الموبايل",  icon: "📱" },
    embarrassing: { label: "إحراج",     icon: "🙈" },
    physical:     { label: "حركة",      icon: "💪" },
    truth:        { label: "صراحة",     icon: "🤫" },
    special:      { label: "خاص",       icon: "⭐" },
    random:       { label: "عشوائي",    icon: "🎲" },
  };

  KF.DATA.challenges = [
    { id: "c001", text: "غني اغنيه اجنبي", category: "singing" },
    { id: "c002", text: "اقف علي رجل واحده لمده دقيقه", category: "physical", duration: 60, flags: ["physical"] },
    { id: "c003", text: "اختار حد من اللي قاعدين يرسملك حاجة علي وشك وتكمل بيها لاخر الجيم", category: "special" },
    { id: "c004", text: "نزل بوست فيس انك هتمسح الاكونت لأسباب دراسيه", category: "phone", flags: ["external"] },
    { id: "c005", text: "اتصل علي رقم عشوائي واعمل عليه حوار", category: "phone", flags: ["external"] },
    { id: "c006", text: "اتصل علي البيست وقوله انك رجعت للإكس", category: "phone", flags: ["external"] },
    { id: "c007", text: "اوصف يومك علي انه فيلم أكشن", category: "acting" },
    { id: "c008", text: "تفرج اللي قاعدين الاستيكرز بتعتك ع الواتساب", category: "phone", flags: ["external"] },
    { id: "c009", text: "حط اوحش صوره ليك بروفايل لمده يوم", category: "phone", flags: ["external"] },
    { id: "c010", text: "اتعامل علي انك روبوت لمده تلات لفات", category: "acting" },
    { id: "c011", text: "او اتكلم انجليزي لمده تلات لفات برضو وممنوع العربي", category: "social" },
    { id: "c012", text: "غني ابن الجيران بتاعه نانسي عجرم", category: "singing" },
    { id: "c013", text: "ادي موبايلك لحد يقلب فيه دقيقتين", category: "phone", duration: 120, flags: ["external"] },
    { id: "c014", text: "خد اسكرين شوت لاي شات عندك وابعته لنفس الشخص", category: "phone", flags: ["external"] },
    { id: "c015", text: "دقيقه بلانك", category: "physical", duration: 60, flags: ["physical"], type: "escapeLike" },
    { id: "c016", text: "تتسأل سؤال صراحه", category: "truth", type: "escapeLike" },
    { id: "c017", text: "تدفع ال5 جنيه", category: "special", type: "escapeLike" },
    { id: "c018", text: "تتجلد 5 مرات بحزام", category: "physical", flags: ["physical", "belt"], type: "escapeLike" },
    { id: "c019", text: "ادي موبايلك للى جنبك يبعت رساله لاي حد يختاره", category: "phone", flags: ["external"] },
    { id: "c020", text: "افتح فيديو لجوهره الرقاصه وقلدها", category: "acting" },
    { id: "c021", text: "غني اي اغنيه بس بدل كل الكلام بكلمه بطاطس", category: "singing" },
    { id: "c022", text: "افتح مسنجر واعمل فيديو كول لآخر حد انت كلمته ومتقفلش انت الاول", category: "phone", flags: ["external"] },
    { id: "c023", text: "اعمل eye contact لمده دقيقه مع حد م اللي قاعدين من غير ما تتكلم او تضحك", category: "social", duration: 60 },
    { id: "c024", text: "اعمل مشهد حبيشه مع اللى قاعدين واعمل انت الرقاصه", category: "acting" },
    { id: "c025", text: "كل معلقه شطه من غير ما تشرب مايه غير بعد 5 دقايق", category: "physical", duration: 300, flags: ["physical", "spicy"] },
    { id: "c026", text: "رن على الاكس وقولها وحشتيني واقفل", category: "phone", flags: ["external"] },
    { id: "c027", text: "ادخل رن على اخر رقم رنيت عليه وقوله معلش نسيت اقولك مع السلامه واقفل", category: "phone", flags: ["external"] },
    { id: "c028", text: "قوم ارقص شرقي دلوقتي مع عمل حركه دينا الرقاصه", category: "physical", flags: ["physical"] },
    { id: "c029", text: "خلي حد م اللى قاعدين يقص شعرك", category: "embarrassing" },
    { id: "c030", text: "خلي اللي على يمينك يختار لك شخصية، واتكلم وتصرف كأنك الشخصية دي لمدة 5 دقايق.", category: "acting", duration: 300 },
    { id: "c031", text: "اتصل بمطعم واسأله علي رقم مطعم تاني", category: "phone", flags: ["external"] },
    { id: "c032", text: "اعمل إعلان مدته دقيقة عن أي حاجة موجودة في القعدة وكأنك بتبيعها بمليون جنيه.", category: "acting", duration: 60 },
    { id: "c033", text: "اعمل مشهد خناقة كامل مع كرسي أو مخدة كأنها شخص زعلك جدًا", category: "acting" },
    { id: "c034", text: "اعمل مشهد بكاء درامي على سبب تافه جدًا تختاره المجموعة", category: "acting" },
    { id: "c035", text: "خلي المجموعة تختار لك موضوعًا عشوائيًا، واتكلم عنه لمدة دقيقتين كأنك خبير عالمي فيه، حتى لو أول مرة تسمع عنه.", category: "social", duration: 120 },
    { id: "c036", text: "اعمل Stand-up Comedy لمدة دقيقة عن نفسك، والممنوع إنك تستخدم أي نكتة محفوظة", category: "acting", duration: 60 },
    { id: "c037", text: "اعمل مشهد رومانسي مع أي شيء تختاره المجموعة لمدة دقيقة كاملة", category: "acting", duration: 60 },
    { id: "c038", text: "اتصل بحد من صحابك وقوله إنك داخل تعمل معاه مشروع ومحتاج منه 10,000 جنيه، وشوف هيقول إيهوانت فاتح سبيكر", category: "phone", flags: ["external"] },
    { id: "c039", text: "خلي صورتك الشخصية صورة يختارها لك اللي جنبك لمدة 3 أيام", category: "phone", flags: ["external"] },
    { id: "c040", text: "سجل Voice Note لمدة 30 ثانية بتغني فيه أغنية رومانسية وابعتها لآخر شخص في الـDM عندك", category: "phone", duration: 30, flags: ["external"] },
    { id: "c041", text: "ابعت لحد من صحابك: \"فاكر اللي حصل يوم الخميس؟\" وممنوع تشرح له أي حاجة لحد ما يرد وتستنى 10 دقايق", category: "phone", flags: ["external"] },
    { id: "c042", text: "مثّل إنك بتطلب إيد شخص للزواج، لكن الشخص اللي قدامك هو كرسي", category: "acting" },
    { id: "c043", text: "اعمل 30 ثانية إعلان عن نفسك كأنك منتج جديد نازل السوق", category: "acting", duration: 30 },
    { id: "c044", text: "افتح سجل البحث عندك وخلّي الموجودين يختاروا آخر بحث تقرأه بصوت عالي", category: "phone", flags: ["external"] },
    { id: "c045", text: "كل من غير ما تستخدم ايدك", category: "physical", flags: ["physical"] },
    { id: "c046", text: "اعمل لايك علي اخر صوره للإكس", category: "phone", flags: ["external"] },
    { id: "c047", text: "كلم ابوك وقوله عايز تتجوز دلوقتي", category: "phone", flags: ["external"] },
    { id: "c048", text: "قول آخر 5 Emojis استخدمتهم واشرح ليه استخدمت كل واحد", category: "truth" },
    { id: "c049", text: "كلم ابوك وقوله انك عايز تسيب البيت", category: "phone", flags: ["external"] },
    { id: "c050", text: "حط تلج ف ضهرك", category: "physical", flags: ["physical"] },
    { id: "c051", text: "ابعت لاخر خمسه كلمتهم واتساب صوره قمر وقولهم فكرت فيك", category: "phone", flags: ["external"] },
    { id: "c052", text: "غني راب لمده دقيقه", category: "singing", duration: 60 },
    { id: "c053", text: "غني وانت في بوقك مايه", category: "physical", flags: ["physical"] },
    { id: "c054", text: "علق ع القعده واللي بيحصل كإنك الشوالي", category: "acting" },
    { id: "c055", text: "احكي موقف محرج حصلك بلهجه صعيدي", category: "embarrassing" },
    { id: "c056", text: "ارسم حد م اللى قاعدين ف 30 ثانيه وسيبهم يتوقعو مين ده", category: "social", duration: 30 },
    { id: "c057", text: "اتقدم لحد من القعده وورينا روميو وجولييت اللى جواكم", category: "acting" },
    { id: "c058", text: "غني حاجه لأم كلثوم", category: "singing" },
  ];

  if (typeof module !== "undefined") module.exports = KF.DATA.challenges;
})(typeof window !== "undefined" ? window : globalThis);
