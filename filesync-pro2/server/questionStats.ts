// Counts what visitors ask «الداهية» so the owner can see the most common questions
// and, above all, the questions it could not answer (to add their answers later).
//
// Storage: a Render Key Value (Redis) instance when REDIS_URL is set, so the counts
// survive restarts (the free web service sleeps after 15 idle minutes). Without it the
// counts live in memory only. No IPs or personal data are stored: only the question
// text (trimmed, capped), its topic and how it was answered.
import net from "node:net";
import { normalizeQuestion, cleanQuestion, groupQuestions, cleanList } from "./questionInsights.ts";

export { normalizeQuestion };

export type AnswerKind = "gemini" | "local" | "unanswered" | "out_of_scope" | "family" | "weather" | "greeting";

const PREFIX = "qstats:";
const MAX_MEMORY_QUESTIONS = 3000;

const today = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10); // Riyadh date

// ───────────── tiny Redis client (no dependency): HINCRBY / HGETALL ─────────────
class MiniRedis {
  private socket: net.Socket | null = null;
  private buffer = Buffer.alloc(0);
  private queue: { resolve: (v: unknown) => void; reject: (e: Error) => void }[] = [];
  private ready: Promise<void> | null = null;

  constructor(private url: URL) {}

  private connect(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.url.hostname, port: Number(this.url.port || 6379) });
      socket.setKeepAlive(true);
      socket.once("connect", async () => {
        this.socket = socket;
        try {
          const pass = decodeURIComponent(this.url.password || "");
          const user = decodeURIComponent(this.url.username || "");
          if (pass) await this.send(user ? ["AUTH", user, pass] : ["AUTH", pass]);
          resolve();
        } catch (e) {
          reject(e as Error);
        }
      });
      socket.on("data", (chunk) => this.onData(chunk));
      const fail = (err: Error) => {
        this.queue.splice(0).forEach((p) => p.reject(err));
        this.socket = null;
        this.ready = null;
        this.buffer = Buffer.alloc(0);
        reject(err);
      };
      socket.on("error", fail);
      socket.on("close", () => fail(new Error("Redis connection closed")));
    });
    return this.ready;
  }

  private send(args: string[]): Promise<unknown> {
    const payload = `*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(a)}\r\n${a}\r\n`).join("");
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.socket!.write(payload);
    });
  }

  async command(args: string[]): Promise<unknown> {
    await this.connect();
    return this.send(args);
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.queue.length) {
      const parsed = parseReply(this.buffer, 0);
      if (!parsed) return; // need more bytes
      this.buffer = this.buffer.subarray(parsed.end);
      const waiter = this.queue.shift()!;
      if (parsed.value instanceof Error) waiter.reject(parsed.value);
      else waiter.resolve(parsed.value);
    }
  }
}

function parseReply(buf: Buffer, pos: number): { value: unknown; end: number } | null {
  const lineEnd = buf.indexOf("\r\n", pos);
  if (lineEnd < 0) return null;
  const type = String.fromCharCode(buf[pos]);
  const line = buf.toString("utf8", pos + 1, lineEnd);
  const next = lineEnd + 2;
  if (type === "+") return { value: line, end: next };
  if (type === "-") return { value: new Error(line), end: next };
  if (type === ":") return { value: Number(line), end: next };
  if (type === "$") {
    const len = Number(line);
    if (len < 0) return { value: null, end: next };
    if (buf.length < next + len + 2) return null;
    return { value: buf.toString("utf8", next, next + len), end: next + len + 2 };
  }
  if (type === "*") {
    const count = Number(line);
    if (count < 0) return { value: null, end: next };
    const items: unknown[] = [];
    let p = next;
    for (let i = 0; i < count; i++) {
      const item = parseReply(buf, p);
      if (!item) return null;
      items.push(item.value);
      p = item.end;
    }
    return { value: items, end: p };
  }
  return { value: new Error(`Unknown Redis reply type ${type}`), end: next };
}

// ───────────── storage ─────────────
const memory = new Map<string, Map<string, number>>();
let redis: MiniRedis | null = null;
try {
  if (process.env.REDIS_URL) redis = new MiniRedis(new URL(process.env.REDIS_URL));
} catch {
  console.warn("[Stats] REDIS_URL is not a valid URL; keeping question stats in memory");
}
let warnedRedis = false;

async function hincr(hash: string, field: string) {
  if (!field) return;
  if (redis) {
    try {
      await redis.command(["HINCRBY", PREFIX + hash, field, "1"]);
      return;
    } catch (err) {
      if (!warnedRedis) console.warn("[Stats] Key Value unavailable, counting in memory:", (err as Error).message);
      warnedRedis = true;
    }
  }
  let m = memory.get(hash);
  if (!m) memory.set(hash, (m = new Map()));
  if (!m.has(field) && m.size >= MAX_MEMORY_QUESTIONS) return;
  m.set(field, (m.get(field) || 0) + 1);
}

const memoryDisplay = new Map<string, string>();
/** Keep the first plain spelling of a question for display («متى موسم الملح»). */
async function setDisplay(q: string, original: string) {
  if (redis) {
    try {
      await redis.command(["HSETNX", PREFIX + "display", q, original]);
      return;
    } catch {
      /* memory below */
    }
  }
  if (!memoryDisplay.has(q) && memoryDisplay.size < MAX_MEMORY_QUESTIONS) memoryDisplay.set(q, original);
}

async function hgetallText(hash: string): Promise<Record<string, string>> {
  if (redis) {
    try {
      const flat = (await redis.command(["HGETALL", PREFIX + hash])) as string[] | null;
      const out: Record<string, string> = {};
      for (let i = 0; flat && i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
      return out;
    } catch {
      /* memory below */
    }
  }
  return Object.fromEntries(memoryDisplay);
}

async function hgetall(hash: string): Promise<Record<string, number>> {
  if (redis) {
    try {
      const flat = (await redis.command(["HGETALL", PREFIX + hash])) as string[] | null;
      const out: Record<string, number> = {};
      for (let i = 0; flat && i < flat.length; i += 2) out[flat[i]] = Number(flat[i + 1]);
      return out;
    } catch {
      /* fall through to memory */
    }
  }
  return Object.fromEntries(memory.get(hash) || []);
}

/** Record one visitor question. Never throws and never delays the answer. */
export function recordQuestion(question: string, kind: AnswerKind, topic?: string | null, lang: "ar" | "en" = "ar") {
  const q = cleanQuestion(question); // the real question, or "" for greetings / small talk
  if (!q && !normalizeQuestion(question)) return;
  void Promise.all([
    q ? hincr("questions", q) : Promise.resolve(),
    hincr("kinds", kind),
    q ? hincr("topics", topic || "other") : Promise.resolve(),
    // Plain question (no greeting around it): remember how the visitor spelled it
    q && normalizeQuestion(question) === q
      ? setDisplay(q, question.trim().replace(/[؟?!.,،]+$/u, "").slice(0, 140))
      : Promise.resolve(),
    hincr("days", today()),
    hincr("langs", lang),
    q && (kind === "unanswered" || kind === "out_of_scope") ? hincr(kind, q) : Promise.resolve(),
  ]).catch(() => {});
}

const top = (rec: Record<string, number>, n: number) =>
  Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([text, count]) => ({ text, count }));

export async function getQuestionStats(limit = 50) {
  const [questions, kinds, topics, days, langs, unanswered, outOfScope] = await Promise.all(
    ["questions", "kinds", "topics", "days", "langs", "unanswered", "out_of_scope"].map(hgetall)
  );
  const total = Object.values(kinds).reduce((a, b) => a + b, 0);
  const display = await hgetallText("display");
  const insights = groupQuestions(questions, limit, display, outOfScope);
  const outOfScopeTotal = Object.values(outOfScope).reduce((a, b) => a + b, 0);
  return {
    storage: redis && !warnedRedis ? "keyvalue" : "memory",
    total,
    kinds,
    langs,
    // Cleaned again on read, so greetings counted before the smart filter disappear too
    groups: insights.groups,
    topQuestions: insights.questions,
    realQuestions: insights.realTotal,
    chatter: Math.max(0, total - insights.realTotal - outOfScopeTotal),
    unanswered: cleanList(unanswered, limit, display),
    outOfScope: cleanList(outOfScope, limit, display),
    topics: insights.topics.slice(0, 30),
    days: Object.entries(days)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30)
      .map(([day, count]) => ({ day, count })),
  };
}
