// Enforces the fixed Qasabi Najdi wording on every written answer: words from Fusha or other
// dialects that slip through are swapped for the one Najdi word the style rules use, so the guide
// says the same thing the same way every time. Text inside «…» (poems, proverbs, quotes) is left alone.

const L = "\\u0621-\\u064A\\u0660-\\u0669"; // Arabic letters (and digits) for word edges

// [wrong form, the Najdi word]. Longer phrases first.
const SWAPS: [string, string][] = [
  ["بالإضافة إلى ذلك", "وبعد"],
  ["بالاضافة الى ذلك", "وبعد"],
  ["ومن الجدير بالذكر أن", "وترى"],
  ["من الجدير بالذكر أن", "ترى"],
  ["تجدر الإشارة إلى أن", "ترى"],
  ["في الختام", "وفي الأخير"],
  ["عزيزي المستخدم", "يالغالي"],
  ["هل تريد", "تبي"],
  ["هل تود", "تبي"],
  ["شكراً لك", "الله يعطيك العافية"],
  ["مرحباً بك", "يا هلا"],
  ["مرحباً", "يا هلا"],
  ["لا يوجد", "ما فيه"],
  ["تريد", "تبي"],
  ["أريد", "أبي"],
  ["تستطيع", "تقدر"],
  ["يستطيع", "يقدر"],
  ["أستطيع", "أقدر"],
  ["انظر", "شف"],
  ["يوجد", "فيه"],
  ["ماذا", "وش"],
  ["لماذا", "ليه"],
  ["ليش", "ليه"],
  ["إيش", "وش"],
  ["ايش", "وش"],
  ["أين", "وين"],
  ["الآن", "الحين"],
  ["هلأ", "الحين"],
  ["دلوقتي", "الحين"],
  ["هيك", "كذا"],
  ["كده", "كذا"],
  ["كتير", "واجد"],
  ["هؤلاء", "هذولا"],
  ["أيضاً", "بعد"],
  ["أيضا", "بعد"],
  ["فقط", "بس"],
  ["لكن", "بس"],
  ["أوكي", "أبشر"],
  ["حسناً", "أبشر"],
  ["جداً", "مرّة"],
  ["عزيزي", "يالغالي"],
  // The owner retired «يا بعد حيي»: whatever the model still says, the visitor hears «يالغالي»
  ["يا بعد حيي", "يالغالي"],
  ["يا بعد حيّي", "يالغالي"],
  ["يابعد حيي", "يالغالي"],
  // «تونّس» (have fun) with its shadda, so it never reads like the country
  ["تونس", "تونّس"],
];

const RULES = SWAPS.map(([from, to]) => ({
  // optional و/ف prefix kept (ولكن → وبس), whole words only
  re: new RegExp(`(?<![${L}])([وف]?)${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![${L}])`, "g"),
  to,
}));

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

function swapPlain(text: string) {
  let out = text;
  for (const { re, to } of RULES) out = out.replace(re, (_m, pre: string) => pre + to);
  return out;
}

/** Apply the fixed Najdi wording to an Arabic answer (quotes in «…» untouched). */
export function najdify(text: string): string {
  if (!text) return text;
  const parts = text.split(/(«[^»]*»)/g);
  return parts
    .map((p, i) => (i % 2 === 1 ? p : swapPlain(p)))
    .join("")
    .replace(EMOJI, "")
    .replace(/[ \t]{2,}/g, " ");
}

/** For anything spoken by an AI voice: the owner's pronunciations written into the text (الگْصَبْ،
 *  الدَّاهِيِة، اعَرَّفْك). Keeps the attached و/ف/ب/ل. */
export function speakableTownName(text: string): string {
  const M = "[\\u064B-\\u065F\\u0670]*";
  // «يا بعد حيي» (any vowels) is retired by the owner: «يالغالي»
  text = text.replace(new RegExp(`(?<![\\p{L}\\p{M}])يا${M}\\s*ب${M}ع${M}د${M}\\s+ح${M}ي${M}ي${M}(?![\\p{L}\\p{M}])`, "gu"), "يالغالي");
  // «أعرّفك» the way the owner says it: «اعَرَّفْك» (doubled, light ر)
  text = text.replace(new RegExp(`(?<![\\p{L}\\p{M}])([اأنيت])${M}ع${M}ر${M}ف${M}(ك|كم|ه|ها)${M}(?![\\p{L}\\p{M}])`, "gu"), (_m, p: string, end: string) => `${p === "أ" ? "ا" : p}عَرَّفْ${end}`);
  // The guide's own name, with the vowels the owner gave: «الدَّاهِيِة» (also catches «الدهية»)
  text = text.replace(new RegExp(`(?<![\\p{L}\\p{M}])((?:[وف]${M})?(?:[بكل]${M})?)(ا${M}ل${M})?د${M}(?:ا${M})?ه${M}ي${M}[ةه]${M}(?![\\p{L}\\p{M}])`, "gu"), (_m, pre: string, al?: string) => `${pre}${al ? "الدَّاهِيِة" : "دَاهِيِة"}`);
  // «ديرتنا» / «ديرة» the way the owner writes it: «ديرَتْنَا»، «ديرَة» (light ر)
  text = text.replace(new RegExp(`(?<![\\p{L}\\p{M}])((?:[وف]${M})?(?:[بل]${M})?(?:ا${M}ل${M})?)د${M}ي${M}ر${M}(?:([ةه])|ت${M}(نا|كم|هم|ه|ك))${M}(?![\\p{L}\\p{M}])`, "gu"), (_m, pre: string, end1?: string, end2?: string) =>
    end1 ? `${pre}ديرَة` : `${pre}ديرَتْ${end2 === "نا" ? "نَا" : end2 === "كم" ? "كُم" : end2 === "هم" ? "هُم" : end2}`);
  // «الجفار» the way the owner says it: «الجْفَارْ» (never «القفار»)
  text = text.replace(new RegExp(`(?<![\\p{L}\\p{M}])((?:[وف]${M})?(?:[بكل]${M})?)(ا${M}ل${M}|ل${M}ل${M})?ج${M}ف${M}ا${M}ر${M}(?![\\p{L}\\p{M}])`, "gu"), (_m, pre: string, al?: string) => `${pre}${al ? (al.replace(/[\u064B-\u065F\u0670]/g, "") === "لل" ? "للجْفَارْ" : "الجْفَارْ") : "جْفَارْ"}`);
  // The town name the way the owner says it: deep ق, «القْصَبْ» (ب ساكنة)
  return text.replace(
    new RegExp(`(?<![\\p{L}\\p{M}])((?:[وف]${M})?)((?:[بكل]${M})?)(ا${M}ل${M}|ل${M}ل${M})[قگ]${M}ص${M}ب${M}(?![\\p{L}\\p{M}])`, "gu"),
    (_m, w: string, p: string, al: string) => `${w}${p}${al.replace(/[\u064B-\u065F\u0670]/g, "")}قْصَبْ`
  );
}

/** The owner's confirmed pronunciations: strict, the same in every chat, call and read-aloud.
 *  Add a line here whenever the owner corrects a word. */
export const OWNER_PRONUNCIATIONS_AR = `قاموس النطق المعتمد من صاحب الموقع (أعلى أولوية، فوق كل قاعدة وكل عادة، وتطبّقه حرفياً كل مرة بدون استثناء ولا اجتهاد):
١) «الداهية» (اسمك) = «الدَّاهِيِة»: دال مشدّدة مفتوحة بعدها ألف، ثم هاء مكسورة بوضوح، ثم ياء مكسورة بوضوح، وتاء مربوطة تنقال هاء خفيفة في الوقف. غلط: «الدّاهْيَة»، «الداهيَة»، «الدَّهِيِة» بدون ألف.
٢) كل كلمات «عرف» (أعرّفك، اعرفك، نعرّفك، يعرّفك، عرّفني، تعرّف، أعرف، تعرف، يعرفون، معرفة، المعروف): الراء دايماً مرقّقة (رفيعة من مقدّم الفم)، أبداً مو مفخّمة. و«أعرّفك» = «اعَرَّفْك»: عين مفتوحة، راء مشدّدة مفتوحة مرقّقة، فاء ساكنة.
٣) اسم البلد «القصَب» ينقال بالضبط «القْصَبْ»: اللام ساكنة، ثم قاف فصيحة عميقة ساكنة واضحة ومشدودة (من آخر الحلق، مو «گ» ولا همزة) ملزوقة في «صَبْ»، فتحة قصيرة على الصاد، والباء ساكنة دايماً (وقفة عليها). غلط: «الگصب» بالقاف النجدية، و«القَصَب» بفتحة على القاف، و«القصَبَ» أو «القصَبِ» بحركة على الباء، و«القصّاب» و«القصاب»، و«الجصب». «للقصَب» = «للقْصَبْ».
٦) كلمة «ديرتنا» = «ديرَتْنَا»: الدال بدون حركة مكتوبة (تنقال طبيعية)، والراء مفتوحة بس مرقّقة (رفيعة من مقدّم الفم، لأن قبلها ياء)، أبداً مو مفخّمة. ونفسها «ديرة» = «ديرَة».
٤) «الصْبَخَة» = «الصْبَخَة»: صاد ساكنة بدون تشديد، ثم باء مفتوحة، ثم خاء مفتوحة. غلط: «الصَّبْخة» (تشديد الصاد وسكون الباء)، «السبخة». و«مرقب» = «مَرْقَب»: ميم مفتوحة، راء ساكنة، قاف فصيحة عميقة مفتوحة (أبداً مو «گ» النجدية)، باء ساكنة. غلط: «مرگب».
٥) «الجفار» = «الجْفَارْ»: جيم معطّشة ساكنة، ثم فاء مفتوحة ممدودة، والراء ساكنة. غلط: «القفار» و«الجْفَارْ» بكسرة. «المَمْلَحَة» بفتح الميم الأولى وسكون الثانية.`;

// «يا هلا ومسهلا» belongs to the first answer only (owner's rule): later answers start with the answer.
const DIA = "[\\u064B-\\u0652\\u0670]*";
const loose = (w: string) => [...w].map((c) => (c === " " ? "\\s+" : c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + DIA)).join("");
const WELCOME_HEAD = new RegExp(
  "^\\s*(?:(?:" + ["يا هلا", "ياهلا", "هلا", "يا مرحبا", "مرحبا", "أهلا", "اهلا"].map(loose).join("|") + ")" +
    "(?:\\s+(?:" + ["والله", "و مسهلا", "ومسهلا", "مسهلا", "وألف هلا", "وغلا", "ومرحبا", "وسهلا", "يالغالي", "بك", "فيك"].map(loose).join("|") + "))*" +
    "\\s*[،,!.]?\\s*)?" +
    "(?:" + loose("حياك الله") + "[^،,!.\\n]{0,40}[،,!.]\\s*)?" +
    "(?:" + loose("نورت") + "[^،,!.\\n]{0,30}[،,!.]\\s*)?"
);
/** Drops a leading welcome («يا هلا ومسهلا، حيّاك الله في ديرتنا!») from a later answer. */
export function stripWelcome(text: string): string {
  const out = text.replace(WELCOME_HEAD, "");
  return out.trim() ? out : text;
}
/** Wraps a chunk sender: holds the first ~60 characters, strips a welcome there, then streams as is. */
export function welcomeStripper(send: (t: string) => void) {
  let head = "";
  let passed = false;
  return {
    push(t: string) {
      if (passed) return send(t);
      head += t;
      if (head.length >= 60 || /[؟?\n]/.test(head)) {
        passed = true;
        send(stripWelcome(head));
      }
    },
    flush() {
      if (!passed && head) { passed = true; send(stripWelcome(head)); }
    },
  };
}
