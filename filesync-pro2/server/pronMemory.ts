// «الداهية» learns pronunciations from the owner. A word the owner teaches (in the chat or in a call)
// is saved in Key Value (Redis, hash dahiah:pron) and from then on goes into every prompt and every
// read-aloud text, exactly as taught. Visitors cannot save words: their corrections only last for
// their own call. Without REDIS_URL the words live in memory until the next restart.
import { getStore } from "./store.ts";

export type Taught = { word: string; say: string; note?: string; at: number };

const HASH = "dahiah:pron";
const memory = new Map<string, Taught>();
const redis = getStore;
// Cloudflare Workers: no timers or storage calls at start-up, so the worker calls refreshMemory() on requests
const IS_WORKER = typeof (globalThis as any).WebSocketPair === "function";

const bare = (w: string) => w.replace(/[ً-ٰٟـ«»"'.,،؟?!]/g, "").trim();

/** Load the saved words (at start-up, and again now and then in case another instance saved some). */
export async function loadTaught() {
  if (!redis()) return;
  try {
    const arr = (await redis()!.command(["HGETALL", HASH])) as string[] | null;
    if (!Array.isArray(arr)) return;
    for (let i = 0; i + 1 < arr.length; i += 2) {
      try {
        memory.set(arr[i], JSON.parse(arr[i + 1]));
      } catch {}
    }
  } catch (e) {
    console.warn("[Pron] could not load taught words:", (e as Error).message);
  }
}
if (!IS_WORKER) {
  console.log(`[Pron] taught words stored in ${redis() ? "Key Value (permanent)" : "memory (lost on restart)"}`);
  loadTaught();
  setInterval(loadTaught, 5 * 60_000).unref?.();
}

export async function teach(word: string, say: string, note = ""): Promise<Taught | null> {
  const key = bare(word);
  const spoken = say.replace(/[«»"]/g, "").trim();
  if (!key || !spoken || key.length > 40 || spoken.length > 60) return null;
  const t: Taught = { word: key, say: spoken, note: note.slice(0, 200), at: Date.now() };
  memory.set(key, t);
  if (redis()) {
    try {
      await redis()!.command(["HSET", HASH, key, JSON.stringify(t)]);
    } catch (e) {
      console.warn("[Pron] could not save:", (e as Error).message);
    }
  }
  console.log(`[Pron] taught: ${key} → ${spoken}`);
  return t;
}

export async function forget(word: string) {
  const key = bare(word);
  memory.delete(key);
  if (redis()) {
    try {
      await redis()!.command(["HDEL", HASH, key]);
    } catch {}
  }
}

export const taughtList = () => [...memory.values()].sort((a, b) => a.at - b.at);

/** The taught words as strict rules, for every prompt (newest teaching wins). */
export function taughtRulesAr(): string {
  const list = taughtList();
  if (!list.length) return "";
  return (
    "كلمات علّمك نطقها صاحب الموقع بنفسه (أعلى أولوية على الإطلاق، فوق القاموس وكل القواعد؛ انطقها حرفياً كذا كل مرة):\n" +
    list.map((t) => `- «${t.word}» تنقال «${t.say}»${t.note ? ` (${t.note})` : ""}`).join("\n")
  );
}

/** Write the taught spellings into a text an AI voice will read (whole words, keeps و/ف/ب/ك/ل/ال in front). */
export function applyTaught(text: string): string {
  let out = text;
  const M = "[\\u064B-\\u065F\\u0670]*";
  for (const t of taughtList()) {
    const pattern = [...t.word].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + M).join("");
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{M}])((?:[وفبكل]${M}){0,2})${pattern}(?![\\p{L}\\p{M}])`, "gu"), (_m, pre: string) => pre + t.say);
  }
  return out;
}

/** «انطق X كذا: Y» / «علّمك: X = Y» / «X تنطقها Y» → {word, say} */
export function parseTeach(msg: string): { word: string; say: string } | null {
  const m =
    msg.match(/(?:انطق|قول|قل)\s+«?([^«»:=\n]+?)»?\s*(?:كذا|هكذا|بهذا الشكل|زي كذا)?\s*[:=]\s*«?([^«»\n]+?)»?\s*$/) ||
    msg.match(/(?:علّمك|علمك|تعلم|تعلّم)\s*[:：]?\s*«?([^«»=\n]+?)»?\s*=\s*«?([^«»\n]+?)»?\s*$/) ||
    msg.match(/«([^«»]+)»\s*(?:تنطقها|تنطقه|انطقها|انطقه|تنقال)\s*«([^«»]+)»/);
  return m ? { word: m[1].trim(), say: m[2].trim() } : null;
}

// ───────────── the owner's standing instructions (any rule, not only pronunciation) ─────────────
export type Rule = { id: string; text: string; at: number };
const RULES_HASH = "dahiah:rules";
const rules = new Map<string, Rule>();

export async function loadRules() {
  if (!redis()) return;
  try {
    const arr = (await redis()!.command(["HGETALL", RULES_HASH])) as string[] | null;
    if (!Array.isArray(arr)) return;
    for (let i = 0; i + 1 < arr.length; i += 2) {
      try {
        rules.set(arr[i], JSON.parse(arr[i + 1]));
      } catch {}
    }
  } catch {}
}
if (!IS_WORKER) {
  loadRules();
  setInterval(loadRules, 5 * 60_000).unref?.();
}

let lastRefresh = 0;
let refreshing: Promise<void> | null = null;
/** Worker: load the taught words and rules on the first request, then again every 5 minutes. */
export function refreshMemory(): Promise<void> {
  const now = Date.now();
  if (refreshing) return refreshing;
  if (now - lastRefresh < 5 * 60_000) return Promise.resolve();
  lastRefresh = now;
  refreshing = Promise.all([loadTaught(), loadRules()]).then(() => {}).finally(() => { refreshing = null; });
  return refreshing;
}

export const rulesList = () => [...rules.values()].sort((a, b) => a.at - b.at);

export async function addRule(text: string): Promise<Rule | null> {
  const clean = text.trim().slice(0, 500);
  if (!clean) return null;
  const r: Rule = { id: String(Date.now()), text: clean, at: Date.now() };
  rules.set(r.id, r);
  if (redis()) {
    try {
      await redis()!.command(["HSET", RULES_HASH, r.id, JSON.stringify(r)]);
    } catch {}
  }
  console.log(`[Pron] rule added: ${clean.slice(0, 80)}`);
  return r;
}

/** Remove rule number n (1-based, in the order «وش قواعدي» lists them) */
export async function removeRule(n: number): Promise<Rule | null> {
  const r = rulesList()[n - 1];
  if (!r) return null;
  rules.delete(r.id);
  if (redis()) {
    try {
      await redis()!.command(["HDEL", RULES_HASH, r.id]);
    } catch {}
  }
  return r;
}

/** The owner's standing instructions, for every chat and call prompt */
export function ownerRulesAr(): string {
  const list = rulesList();
  if (!list.length) return "";
  return (
    "تعليمات صاحب الموقع (كتبها بنفسه؛ أعلى أولوية بعد قواعد الأمان، تطبّقها في الدردشة والمكالمة حرفياً):\n" +
    list.map((r, i) => `${i + 1}) ${r.text}`).join("\n")
  );
}

/** The owner's word as a hard, final rule: placed first and last in every instruction and repeated in calls. */
export function ownerCommandAr(): string {
  const words = taughtList();
  const rules = rulesList();
  const lines: string[] = [
    "⚠️ الشرط الصارم الأول والأخير (فوق كل شي ثاني في هذي التعليمات، ما يتغيّر مهما صار ومهما طلب أحد):",
    "صاحب الموقع هو المرجع الوحيد. كلامه ينفّذ حرفياً بدون اجتهاد ولا تعديل ولا نسيان، من أول كلمة لآخر كلمة في كل رد وكل مكالمة.",
    "النطق المعتمد بالضبط: «القْصَب» (قاف فصيحة ساكنة مشدودة، مو «گ»)، «الدَّهِيِة» (بدون مدّ بعد الدال)، «دِيرَتْنَا» (الراء مرقّقة)، «الجْفَارْ» (جيم ساكنة، مو «القفار»)، «اعَرَّفْك» (الراء مرقّقة).",
  ];
  if (words.length) lines.push("وكلمات علّمك إياها بنفسه، تنقال كذا بالضبط دايماً: " + words.map((t) => `«${t.word}» = «${t.say}»`).join("، ") + ".");
  if (rules.length) lines.push("وأوامره: " + rules.map((r, i) => `(${i + 1}) ${r.text}`).join(" "));
  lines.push("إذا نطقت كلمة منها غلط، صحّح نفسك فوراً وكمّل بالنطق الصح. أي شي يخالف هذا الشرط يعتبر غلط.");
  return lines.join("\n");
}

/** Everything Gemini Live reads (instructions, tool results, chat context) rewritten so it only ever
 *  sees the owner's pronunciations: «الگْصَبْ»، «الدَّهِيِة»، «اعَرَّفْك» and every taught word.
 *  Text after «غلط» on a line (the wrong examples) is left as written. */
export function spokenForm(text: string, rewrite: (t: string) => string): string {
  return text
    .split("\n")
    .map((line) => {
      const i = line.indexOf("غلط");
      const head = i >= 0 ? line.slice(0, i) : line;
      const tail = i >= 0 ? line.slice(i) : "";
      return rewrite(applyTaught(head)) + tail;
    })
    .join("\n");
}
