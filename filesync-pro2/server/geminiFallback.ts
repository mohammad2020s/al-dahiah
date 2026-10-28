// Spreads the chat over several Gemini models and two keys so it keeps answering with AI:
//   1) free key  · gemini-3.8-flash        (smartest, ~20 requests/day free)
//   2) free key  · gemini-3.5-flash-lite   (~500/day free, its own quota)
//   3) free key  · gemini-3.1-flash-lite   (~500/day free, its own quota)
//   4) paid key  · gemini-3.8-flash        (only when every free quota is used up)
// Free vs. paid is decided per Google project, so the paid step needs a key from a
// separate project that has billing on: GEMINI_PAID_API_KEY. Without it, step 4 is skipped
// and the site answers from local knowledge as before.
// Each step that hits its quota is paused until the time Google gives in the error
// (daily quotas reset at midnight Pacific time), so later messages skip it instantly.
import { GoogleGenAI } from "@google/genai";

export type Tier = "free" | "paid";
export interface Engine {
  tier: Tier;
  model: string;
}

const CHAT_CHAIN: Engine[] = [
  { tier: "free", model: process.env.GEMINI_FREE_MODEL_1 || "gemini-3.8-flash" },
  { tier: "free", model: process.env.GEMINI_FREE_MODEL_2 || "gemini-3.5-flash-lite" },
  { tier: "free", model: process.env.GEMINI_FREE_MODEL_3 || "gemini-3.1-flash-lite" },
  { tier: "paid", model: process.env.GEMINI_PAID_MODEL || "gemini-3.8-flash" },
];

/** A model that hasn't said its first word by then is skipped for the next one. */
const FIRST_WORD_MS = Number(process.env.GEMINI_FIRST_WORD_MS || 7000);
const slowStrikes = new Map<string, number>();

/** Safety net on top of the AI Studio spend cap: paid chat requests per day (Riyadh day). */
const PAID_DAILY_LIMIT = Number(process.env.GEMINI_PAID_DAILY_LIMIT || 500);

export const keyFor = (tier: Tier) =>
  (tier === "free" ? process.env.GEMINI_API_KEY : process.env.GEMINI_PAID_API_KEY)?.trim() || "";

const clients = new Map<string, GoogleGenAI>();
function client(tier: Tier) {
  const key = keyFor(tier);
  let c = clients.get(key);
  if (!c) {
    c = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    clients.set(key, c);
  }
  return c;
}

// ───────── pauses after quota / availability errors ─────────
const pausedUntil = new Map<string, number>();
const id = (e: Engine) => `${e.tier}:${e.model}`;
export const isPaused = (e: Engine) => (pausedUntil.get(id(e)) || 0) > Date.now();

/** Next midnight in Los Angeles, when Gemini daily quotas reset. */
function nextPacificMidnight(now = Date.now()): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", hour12: false, hour: "numeric", minute: "numeric", second: "numeric",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(now)).map((p) => [p.type, p.value]));
  const sinceMidnight = ((Number(parts.hour) % 24) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000;
  return now - sinceMidnight + 24 * 3600_000 + 60_000; // +1 min margin
}

/** How long to skip an engine after this error (0 = don't pause, just try the next one). */
export function pauseForError(message: string): number {
  const m = message || "";
  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(m)) {
    // Google says how long, e.g. "Please retry in 13h51m43.04s" or "retryDelay": "40s"
    const retry = /retry in\s+(?:(\d+)h)?\s*(?:(\d+)m(?!s))?\s*(?:([\d.]+)s)?/i.exec(m) || /"retryDelay"\s*:\s*"([\d.]+)s"/i.exec(m);
    if (retry) {
      const ms = retry.length === 2
        ? Number(retry[1]) * 1000
        : (Number(retry[1] || 0) * 3600 + Number(retry[2] || 0) * 60 + Number(retry[3] || 0)) * 1000;
      if (ms > 0) return ms + 5_000;
    }
    if (/per\s*day|PerDay|daily/i.test(m)) return nextPacificMidnight() - Date.now();
    return 60_000; // per-minute limit
  }
  if (/\b402\b|billing|prepay|credit balance/i.test(m)) return 30 * 60_000; // paid key out of credit
  if (/\b404\b|NOT_FOUND|not found|is not supported/i.test(m)) return 6 * 3600_000; // model retired / not on this tier
  if (/\b(401|403)\b|API key not valid|PERMISSION_DENIED/i.test(m)) return 30 * 60_000;
  if (/\b(500|503)\b|UNAVAILABLE|overloaded|high demand/i.test(m)) return 30_000;
  return 0;
}

export function pause(e: Engine, message: string) {
  const ms = pauseForError(message);
  if (ms > 0) {
    pausedUntil.set(id(e), Date.now() + ms);
    console.warn(`[Gemini] ${id(e)} paused for ${Math.round(ms / 60_000)} min: ${message.slice(0, 160).replace(/\s+/g, " ")}`);
  }
}

// ───────── paid usage guard ─────────
let paidDay = "";
let paidCount = 0;
const riyadhDay = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
function takePaidSlot(): boolean {
  if (paidDay !== riyadhDay()) {
    paidDay = riyadhDay();
    paidCount = 0;
  }
  if (paidCount >= PAID_DAILY_LIMIT) return false;
  paidCount++;
  return true;
}

/** Engines that can be tried right now, in order. */
export function availableChatEngines(): Engine[] {
  return CHAT_CHAIN.filter((e) => keyFor(e.tier) && !isPaused(e));
}

export interface StreamResult {
  text: string;
  engine: Engine | null;
  /** True when the whole time budget ran out */
  timedOut: boolean;
}

/**
 * Stream an answer from the first engine that works. Chunks go to onChunk only from the
 * engine that actually answers (quota errors arrive before any text, so nothing is mixed).
 */
export async function streamChatWithFallback(opts: {
  contents: any[];
  systemInstruction: string;
  maxOutputTokens: number;
  budgetMs: number;
  /** Time a model gets to start answering (photos need longer) */
  firstWordMs?: number;
  onChunk: (text: string) => void;
  isCancelled: () => boolean;
}): Promise<StreamResult> {
  const deadline = Date.now() + opts.budgetMs;
  for (const engine of availableChatEngines()) {
    const left = deadline - Date.now();
    if (left < 1500 || opts.isCancelled()) return { text: "", engine: null, timedOut: left < 1500 };
    if (engine.tier === "paid" && !takePaidSlot()) {
      console.warn(`[Gemini] Paid daily limit (${PAID_DAILY_LIMIT}) reached, answering locally`);
      continue;
    }

    // A model gets FIRST_WORD_MS to start answering; once it streams, it may use the rest
    const abort = new AbortController();
    const startedAt = Date.now();
    let firstWordAt = 0;
    const timer = setTimeout(() => abort.abort(), Math.min(left, opts.firstWordMs || FIRST_WORD_MS));
    const timedOut = new Promise<"timeout">((resolve) => abort.signal.addEventListener("abort", () => resolve("timeout")));
    let text = "";
    try {
      const run = (async () => {
        const stream = await client(engine.tier).models.generateContentStream({
          model: engine.model,
          contents: opts.contents,
          config: { systemInstruction: opts.systemInstruction, maxOutputTokens: opts.maxOutputTokens, abortSignal: abort.signal },
        });
        for await (const chunk of stream) {
          if (opts.isCancelled() || abort.signal.aborted) break;
          const t = chunk.text;
          if (t && !abort.signal.aborted) {
            if (!firstWordAt) {
              firstWordAt = Date.now();
              clearTimeout(timer);
              setTimeout(() => abort.abort(), Math.max(0, deadline - Date.now())).unref?.();
            }
            text += t;
            opts.onChunk(t);
          }
        }
        return "done" as const;
      })();
      const outcome = await Promise.race([run, timedOut]);
      if (outcome === "timeout") {
        if (text.trim()) return { text, engine, timedOut: false }; // ran out of time mid-answer: keep it
        console.warn(`[Gemini] ${id(engine)} gave no answer in ${Math.round((Date.now() - startedAt) / 1000)} s, trying the next model`);
        slowStrikes.set(id(engine), (slowStrikes.get(id(engine)) || 0) + 1);
        if ((slowStrikes.get(id(engine)) || 0) >= 2) {
          pausedUntil.set(id(engine), Date.now() + 10 * 60_000); // slow twice in a row: skip it for 10 min
          slowStrikes.delete(id(engine));
        }
        continue;
      }
      slowStrikes.delete(id(engine));
      if (text.trim()) {
        console.log(`[Gemini] answered by ${id(engine)}: first word ${Math.round((firstWordAt - startedAt) / 100) / 10} s, total ${Math.round((Date.now() - startedAt) / 100) / 10} s`);
        return { text, engine, timedOut: false };
      }
      // Empty answer (e.g. safety block): try the next engine
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (text.trim()) return { text, engine, timedOut: false }; // cut off mid-answer: keep what we have
      pause(engine, msg);
      if (!pauseForError(msg)) console.warn(`[Gemini] ${id(engine)} failed: ${msg.slice(0, 200)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  return { text: "", engine: null, timedOut: false };
}

/** For the live voice call and generated speech: free key first, paid key after its quota. */
export function voiceKeys(kind: "live" | "tts"): { tier: Tier; key: string }[] {
  return (["free", "paid"] as Tier[])
    .filter((tier) => keyFor(tier) && !isPaused({ tier, model: kind }))
    .map((tier) => ({ tier, key: keyFor(tier) }));
}
export const pauseVoice = (kind: "live" | "tts", tier: Tier, message: string) => pause({ tier, model: kind }, message);
