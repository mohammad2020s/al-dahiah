// «شاركنا رأيك في الموسم»: a one-minute survey in the site. Answers go to D1 (table «survey»);
// the owner reads the totals and comments on /survey. The questions and their options live here,
// so the page and the totals always agree.
import { Router, type Request, type Response } from "express";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { getD1 } from "./store.ts";
import { createLimiter, clientIp } from "./rateLimit.ts";

export const SURVEY = {
  liked: ["المملحة", "القرية التراثية والدور", "العرضة والسامري", "فعاليات الأطفال والعائلة", "المطاعم والقهوة", "السوق والحرف", "الداهية (الدليل الذكي)"],
  improve: ["الزحام والتنظيم", "المواقف", "الأسعار", "النظافة", "اللوحات والإرشاد", "الفعاليات", "ما فيه شي، كل شي زين"],
  recommend: ["أكيد", "يمكن", "لا"],
  dahiah: ["ساعدني كثير", "ساعدني شوي", "ما استخدمته"],
  from: ["القصب", "شقراء والوشم", "الرياض", "القصيم", "مكان ثاني"],
} as const;

const limit = createLimiter({ windowMs: 60 * 60_000, max: 3 });
let ready: Promise<unknown> | null = null;
function db() {
  const d = getD1();
  if (!d) return null;
  ready ||= d.prepare("CREATE TABLE IF NOT EXISTS survey (id TEXT PRIMARY KEY, at TEXT NOT NULL, data TEXT NOT NULL)").run();
  return d;
}
function isOwner(req: Request): boolean {
  const expected = process.env.STATS_KEY || "";
  const given = String(req.headers["x-stats-key"] || "");
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
const pick = (v: unknown, opts: readonly string[]) => (opts.includes(String(v)) ? String(v) : "");
const pickMany = (v: unknown, opts: readonly string[]) => (Array.isArray(v) ? [...new Set(v.map(String).filter((x) => opts.includes(x)))] : []);

export const surveyRouter = Router();

surveyRouter.post("/survey", async (req: Request, res: Response) => {
  const en = req.body?.lang === "en";
  const d = db();
  if (!d) return res.status(503).json({ error: en ? "Not available right now." : "مو متاح الحين." });
  const rating = Math.round(Number(req.body?.rating));
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: en ? "Please rate your visit first." : "قيّم تجربتك أول (من نجمة لخمس)." });
  if (!limit(clientIp(req)).ok) return res.status(429).json({ error: en ? "Thanks, we already have your answers." : "شكراً، وصلتنا إجاباتك." });
  const data = {
    rating,
    liked: pickMany(req.body?.liked, SURVEY.liked),
    improve: pickMany(req.body?.improve, SURVEY.improve),
    recommend: pick(req.body?.recommend, SURVEY.recommend),
    dahiah: pick(req.body?.dahiah, SURVEY.dahiah),
    from: pick(req.body?.from, SURVEY.from),
    note: String(req.body?.note || "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 500),
    lang: en ? "en" : "ar",
  };
  await ready;
  await d.prepare("INSERT INTO survey (id, at, data) VALUES (?1, ?2, ?3)").bind(randomUUID(), new Date().toISOString(), JSON.stringify(data)).run();
  res.json({ ok: true });
});

surveyRouter.get("/owner/survey", async (req: Request, res: Response) => {
  if (!isOwner(req)) return res.status(403).json({ error: "forbidden" });
  const d = db();
  if (!d) return res.json({ count: 0 });
  await ready;
  const { results } = await d.prepare("SELECT at, data FROM survey ORDER BY at DESC LIMIT 5000").all();
  const rows = (results || []).map((r: any) => { try { return { at: r.at, ...JSON.parse(r.data) }; } catch { return null; } }).filter(Boolean) as any[];
  const tally = (key: string, opts: readonly string[], many = false) => {
    const m: Record<string, number> = Object.fromEntries(opts.map((o) => [o, 0]));
    for (const r of rows) for (const v of many ? r[key] || [] : [r[key]]) if (v in m) m[v]++;
    return opts.map((label) => ({ label, count: m[label] })).sort((a, b) => b.count - a.count);
  };
  const stars = [1, 2, 3, 4, 5].map((s) => rows.filter((r) => r.rating === s).length);
  res.set("Cache-Control", "no-store").json({
    count: rows.length,
    average: rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0,
    stars,
    liked: tally("liked", SURVEY.liked, true),
    improve: tally("improve", SURVEY.improve, true),
    recommend: tally("recommend", SURVEY.recommend),
    dahiah: tally("dahiah", SURVEY.dahiah),
    from: tally("from", SURVEY.from),
    notes: rows.filter((r) => r.note).slice(0, 200).map((r) => ({ at: r.at, rating: r.rating, note: r.note })),
  });
});
