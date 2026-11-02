// «الداهية» learns pronunciations from the owner. A word the owner teaches (in the chat or in a call)
// is saved in Key Value (Redis, hash dahiah:pron) and from then on goes into every prompt and every
// read-aloud text, exactly as taught. Visitors cannot save words: their corrections only last for
// their own call. Without REDIS_URL the words live in memory until the next restart.
import { MiniRedis } from "./questionStats.ts";

export type Taught = { word: string; say: string; note?: string; at: number };

const HASH = "dahiah:pron";
const memory = new Map<string, Taught>();
let redis: MiniRedis | null = null;
try {
  if (process.env.REDIS_URL) redis = new MiniRedis(new URL(process.env.REDIS_URL));
} catch {
  redis = null;
}

const bare = (w: string) => w.replace(/[ً-ٰٟـ«»"'.,،؟?!]/g, "").trim();

/** Load the saved words (at start-up, and again now and then in case another instance saved some). */
export async function loadTaught() {
  if (!redis) return;
  try {
    const arr = (await redis.command(["HGETALL", HASH])) as string[] | null;
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
loadTaught();
setInterval(loadTaught, 5 * 60_000).unref?.();

export async function teach(word: string, say: string, note = ""): Promise<Taught | null> {
  const key = bare(word);
  const spoken = say.replace(/[«»"]/g, "").trim();
  if (!key || !spoken || key.length > 40 || spoken.length > 60) return null;
  const t: Taught = { word: key, say: spoken, note: note.slice(0, 200), at: Date.now() };
  memory.set(key, t);
  if (redis) {
    try {
      await redis.command(["HSET", HASH, key, JSON.stringify(t)]);
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
  if (redis) {
    try {
      await redis.command(["HDEL", HASH, key]);
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
