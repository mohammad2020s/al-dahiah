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
  ["عزيزي المستخدم", "يا بعد حيي"],
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
  ["عزيزي", "يا بعد حيي"],
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

/** For anything spoken by an AI voice: the town name becomes «ديرتنا» (the voices cannot say «القْصَبْ»
 *  with a vowel-less ق, so they never say it wrong). Keeps the attached و/ف/ب/ل. */
export function speakableTownName(text: string): string {
  const M = "[\\u064B-\\u065F\\u0670]*";
  // The guide's own name, with the vowels the owner gave: «الدَاهِيِة»
  text = text.replace(new RegExp(`(?<![\\p{L}\\p{M}])((?:[وف]${M})?(?:[بكل]${M})?)(ا${M}ل${M})?د${M}ا${M}ه${M}ي${M}[ةه]${M}(?![\\p{L}\\p{M}])`, "gu"), (_m, pre: string, al?: string) => `${pre}${al ? "ال" : ""}دَاهِيِة`);
  return text.replace(
    new RegExp(`(?<![\\p{L}\\p{M}])((?:[وف]${M})?)((?:[بكل]${M})?)(?:ا${M}ل${M}|ل${M})ق${M}ص${M}ب${M}(?![\\p{L}\\p{M}])`, "gu"),
    (_m, w: string, p: string) => `${w}${p}ديرتنا`
  );
}
