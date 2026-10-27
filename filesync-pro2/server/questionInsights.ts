// «Smart» reading of visitor questions for the stats page, without spending Gemini quota:
// 1) cleanQuestion drops greetings / small talk («السلام عليكم», «كيف الحال», «شكراً»)
//    and keeps only the real question («السلام عليكم وين المملحة» → «وين المملحه»).
// 2) groupQuestions puts questions with the same meaning under one heading
//    («وين المملحه», «موقع الممالح», «كيف اوصل للجفار» → «ممالح القصب — الموقع والطريق»).
import { matchPlaceTopic } from "./alQasabKnowledge.ts";

const MAX_QUESTION_CHARS = 140;

/** One form per question so «وين المملحة؟» and «وين المملحه» count together. */
export function normalizeQuestion(text: string): string {
  return (text || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // tashkeel, tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[؟?!.,،؛:"'«»()\[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, MAX_QUESTION_CHARS);
}

// Phrases that carry no question (already in normalizeQuestion form: no tashkeel, ة→ه, ى→ي)
const CHATTER_PHRASES = [
  // greetings
  "السلام عليكم ورحمه الله وبركاته", "السلام عليكم ورحمه الله", "السلام عليكم", "سلام عليكم", "وعليكم السلام",
  "السلام", "سلام", "اهلا وسهلا", "اهلين", "اهلا", "هلا والله", "هلا وغلا", "هلا", "مرحبا", "مرحبتين", "مرحبا بك",
  "هاي", "هلو", "صباح الخير", "صباح النور", "مساء الخير", "مساء النور", "حياك الله", "حياك",
  "hi there", "hello", "hi", "hey", "good morning", "good evening", "salam", "assalamu alaikum",
  // how are you
  "كيف الحال", "كيف حالك", "كيفك", "شلونك", "شلون الحال", "وش علومك", "علومك", "وش اخبارك", "اخبارك", "شخبارك",
  "عساك طيب", "عساك بخير", "انت بخير", "how are you", "how r u",
  // replies & thanks
  "الحمد لله", "الحمدلله", "بخير", "تمام", "شكرا جزيلا", "شكرا", "مشكور", "الله يعطيك العافيه", "يعطيك العافيه",
  "تسلم", "ما قصرت", "جزاك الله خير", "الله يجزاك خير", "thanks", "thank you", "thx",
  "ok", "okay", "اوكي", "اوك", "طيب", "زين", "ممتاز", "حلو", "رائع", "جميل", "نعم", "لا", "yes", "no",
  "مع السلامه", "في امان الله", "باي", "bye",
  // about the bot itself
  "من انت", "مين انت", "وش انت", "وش اسمك", "who are you", "what is your name",
  // addressing
  "يا الداهيه", "يالداهيه", "الداهيه", "يا", "ياخوي", "يا اخوي", "يا الغالي", "طال عمرك",
].sort((a, b) => b.length - a.length); // longest first so «السلام عليكم» goes before «السلام»

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CHATTER_ALT = CHATTER_PHRASES.map(escape).join("|");
// Only at the start or end of the message: «وش حلو في القصب» keeps its «حلو»
const LEADING_RE = new RegExp(`^(?:${CHATTER_ALT})(?:\\s+|$)`, "u");
const TRAILING_RE = new RegExp(`(?:^|\\s+)(?:${CHATTER_ALT})$`, "u");

/** The real question inside a message, or "" when it is only greeting / small talk. */
export function cleanQuestion(text: string): string {
  let s = normalizeQuestion(text);
  // Peel greetings off both ends until none is left («السلام عليكم هلا كيف الحال وين المملحه»)
  for (let i = 0; i < 12; i++) {
    const next = s.replace(LEADING_RE, "").replace(TRAILING_RE, "").trim();
    if (next === s) break;
    s = next;
  }
  s = s.replace(/^(و|ف)\s+/, "").replace(/\s+(و|ف)$/, "").trim();
  if (/^(ه|ha)+$/i.test(s)) return ""; // «ههههه»
  if (!/[\p{L}\p{N}]/u.test(s)) return "";
  if (s.replace(/\s/g, "").length < 3) return ""; // a stray letter or two
  return s;
}

type Intent = "location" | "time" | "price" | "photos" | "info";

const INTENTS: { id: Intent; label: string; words: string[] }[] = [
  { id: "price", label: "التذاكر والأسعار", words: ["تذكر", "تذاكر", "سعر", "اسعار", "بكم", "رسوم", "مجان", "حجز", "ticket", "price", "cost", "free"] },
  { id: "time", label: "المواعيد", words: ["متي", "متى", "موعد", "مواعيد", "تاريخ", "وقت", "ساعه", "يبدا", "يفتح", "دوام", "when", "date", "time", "open"] },
  { id: "location", label: "الموقع والطريق", words: ["وين", "اين", "موقع", "لوكيشن", "مكان", "كيف اوصل", "طريق", "اتجاه", "خريطه", "يبعد", "تبعد", "where", "location", "directions", "map", "how to get"] },
  { id: "photos", label: "الصور", words: ["صور", "صوره", "وريني", "photo", "picture", "image"] },
];
const INFO_LABEL = "معلومات عامة";

const TOPIC_LABELS: Record<string, string> = {
  muqhim_pan: "مملحة المقحم", salt_pans: "ممالح القصب (الجفار)", sabkha: "الصبخة", zahim_palace: "قصر الزاحم",
  qusaibi_building: "مبنى القصبي", obaidi_souq: "سوق العبيدي", rashid_house: "منزل الراشد", old_town: "البلدة القديمة",
  marqab: "المرقب", season: "موسم الملح", town: "مدينة القصب", cafes: "المقاهي", weather: "الطقس",
};
const CAFE_WORDS = ["قهوه", "كافيه", "مقهي", "مقاهي", "كوفي", "بدور", "ناقع", "شاهي", "ديوانيه", "cafe", "coffee"];
const WEATHER_WORDS = ["طقس", "الجو", "حراره", "مطر", "weather", "temperature"];
const SEASON_WORDS = ["تذكر", "تذاكر", "فعاليات", "مهرجان", "festival", "ticket"];

function topicOf(q: string): string | null {
  const t = matchPlaceTopic(q);
  if (t) return t.id;
  if (CAFE_WORDS.some((w) => q.includes(w))) return "cafes";
  if (WEATHER_WORDS.some((w) => q.includes(w))) return "weather";
  if (SEASON_WORDS.some((w) => q.includes(w))) return "season";
  return null;
}

function intentOf(q: string): Intent {
  return INTENTS.find((i) => i.words.some((w) => q.includes(w)))?.id || "info";
}

export interface QuestionGroup {
  label: string;
  count: number;
  /** How differently people asked it, most common first */
  examples: { text: string; count: number }[];
}

/** Clean every question, merge the same question, and group questions that mean the same thing. */
export function groupQuestions(
  raw: Record<string, number>,
  limit = 40,
  display: Record<string, string> = {},
  exclude: Record<string, number> = {}
): { groups: QuestionGroup[]; questions: { text: string; count: number }[]; topics: { text: string; count: number }[]; realTotal: number } {
  // 1) clean + merge («السلام عليكم وين المملحه» and «وين المملحه» are one question)
  const merged = new Map<string, number>();
  for (const [text, count] of Object.entries(raw)) {
    const q = cleanQuestion(text);
    if (q) merged.set(q, (merged.get(q) || 0) + count);
  }
  // Out-of-scope questions have their own list, so they don't crowd the common questions
  for (const [text, count] of Object.entries(exclude)) {
    const q = cleanQuestion(text);
    const left = (merged.get(q) || 0) - count;
    if (left > 0) merged.set(q, left);
    else merged.delete(q);
  }
  const realTotal = [...merged.values()].reduce((a, b) => a + b, 0);
  // Show the question as a visitor wrote it («متى» not «متي») when we have that form
  const shown = (q: string) => display[q] || q;
  const questions = [...merged].sort((a, b) => b[1] - a[1]).map(([text, count]) => ({ text, count }));

  // 2) group by meaning: place/topic × what they want to know
  const groups = new Map<string, QuestionGroup>();
  const topicCounts = new Map<string, number>();
  for (const { text, count } of questions) {
    const topic = topicOf(text);
    const intent = intentOf(text);
    const intentLabel = INTENTS.find((i) => i.id === intent)?.label || INFO_LABEL;
    // A question we can't place stays on its own so nothing gets lumped together wrongly
    const key = topic ? `${topic}|${intent}` : `q|${text}`;
    const label = topic ? `${TOPIC_LABELS[topic] || topic} — ${intentLabel}` : shown(text);
    const g = groups.get(key) || { label, count: 0, examples: [] };
    g.count += count;
    g.examples.push({ text: shown(text), count });
    topicCounts.set(topic || "other", (topicCounts.get(topic || "other") || 0) + count);
    groups.set(key, g);
  }
  const sorted = [...groups.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((g) => ({ ...g, examples: g.examples.slice(0, 5) }));
  const topics = [...topicCounts].sort((a, b) => b[1] - a[1]).map(([text, count]) => ({ text, count }));
  return { groups: sorted, questions: questions.slice(0, limit).map((q) => ({ text: shown(q.text), count: q.count })), topics, realTotal };
}

/** Same cleaning for a plain list (unanswered / out-of-scope): drop chatter, merge duplicates. */
export function cleanList(raw: Record<string, number>, limit = 40, display: Record<string, string> = {}) {
  return groupQuestions(raw, limit, display).questions;
}
