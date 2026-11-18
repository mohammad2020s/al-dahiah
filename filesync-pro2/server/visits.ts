// Who visits «الداهية»: counted by the site itself, shown to the owner on /visitors.
// Each page load sends one small beacon (/api/visit) with a random visitor id the browser keeps
// (no name, no IP address is stored). The worker adds Cloudflare's country/city for the request.
// Everything is a counter in the D1 store (hash → field → number):
//   visits:views   day → page loads            visits:uniq  day → different visitors that day
//   visits:new     day → first-time visitors   visits:hours hour (Riyadh) → page loads
//   visits:calls   day → voice calls           visits:chats day → chat questions
//   visits:countries / cities / devices / os / sources / langs → visitors (once per visitor per day)
//   visits:totals  views / people (all time)
import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { getStore } from "./store.ts";

const riyadh = (t = Date.now()) => new Date(t + 3 * 3600_000);
export const riyadhDay = (t = Date.now()) => riyadh(t).toISOString().slice(0, 10);
const riyadhHour = (t = Date.now()) => riyadh(t).getUTCHours();

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor/i;

function device(ua: string) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "تابلت";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "جوال";
  return "كمبيوتر";
}
function os(ua: string) {
  if (/iPhone|iPad|iPod/i.test(ua)) return "آيفون / آيباد";
  if (/Android/i.test(ua)) return "أندرويد";
  if (/Windows/i.test(ua)) return "ويندوز";
  if (/Macintosh|Mac OS X/i.test(ua)) return "ماك";
  if (/Linux|CrOS/i.test(ua)) return "لينكس / كروم";
  return "غير معروف";
}
/** Where the visitor came from: ?src=…, the referring site, or the app's own browser. */
function source(ref: string, src: string, ua: string) {
  const s = src.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);
  if (s === "qr") return "رمز QR";
  if (s) return s;
  let host = "";
  try {
    host = ref ? new URL(ref).hostname.replace(/^www\./, "") : "";
  } catch {}
  const h = host + " " + ua;
  if (/al-dahiah\.com|workers\.dev/.test(host)) return "";
  if (/instagram/i.test(h)) return "إنستقرام";
  if (/snapchat/i.test(h)) return "سناب شات";
  if (/tiktok|musical_ly|bytedance/i.test(h)) return "تيك توك";
  if (/(^|\.)t\.co\b|twitter|x\.com|\bTwitter/i.test(h)) return "إكس (تويتر)";
  if (/whatsapp|wa\.me/i.test(h)) return "واتساب";
  if (/facebook|FBAN|FBAV|fb\.com/i.test(h)) return "فيسبوك";
  if (/google\./i.test(host)) return "قوقل";
  if (/bing|duckduckgo|yahoo|yandex/i.test(host)) return "محركات بحث";
  if (host) return host.slice(0, 40);
  return "مباشر (رابط، واتساب، QR)";
}

const hincr = (h: string, k: string, by = 1) => getStore()?.command(["HINCRBY", h, k, String(by)]);

/** One page load. Errors are swallowed: counting must never break the site. */
export async function recordVisit(
  body: any,
  info: { country?: string; city?: string; ua: string }
): Promise<void> {
  const store = getStore();
  if (!store) return;
  const ua = String(info.ua || "");
  if (BOT.test(ua)) return;
  const vid = String(body?.vid || "");
  if (!/^[a-z0-9]{8,40}$/i.test(vid)) return;
  const day = riyadhDay();
  try {
    await Promise.all([hincr("visits:views", day), hincr("visits:hours", String(riyadhHour())), hincr("visits:totals", "views")]);
    const firstToday = Number(await store.command(["HSETNX", `visits:seen:${day}`, vid, "1"])) === 1;
    if (!firstToday) return;
    const everNew = Number(await store.command(["HSETNX", "visits:people", vid, day])) === 1;
    const src = source(String(body?.ref || ""), String(body?.src || ""), ua);
    const lang = /^ar/i.test(String(body?.lang || "")) ? "العربي" : "غير العربي";
    const country = String(info.country || "").toUpperCase().slice(0, 2);
    const city = String(info.city || "").slice(0, 40);
    await Promise.all([
      hincr("visits:uniq", day),
      everNew ? hincr("visits:new", day) : null,
      everNew ? hincr("visits:totals", "people") : null,
      country ? hincr("visits:countries", country) : null,
      city ? hincr("visits:cities", city) : null,
      hincr("visits:devices", device(ua)),
      hincr("visits:os", os(ua)),
      src ? hincr("visits:sources", src) : null,
      hincr("visits:langs", lang),
    ]);
  } catch (e: any) {
    console.warn(`[Visits] not counted: ${String(e?.message || e).slice(0, 160)}`);
  }
}

/** +1 for today on a daily counter («calls», «chats»). */
export function countToday(what: "calls" | "chats") {
  void Promise.resolve(hincr(`visits:${what}`, riyadhDay())).catch(() => {});
}

function isOwner(req: Request): boolean {
  const expected = process.env.STATS_KEY || "";
  const given = String(req.headers["x-stats-key"] || "");
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

async function hash(h: string): Promise<Record<string, number>> {
  const flat = ((await getStore()?.command(["HGETALL", h])) as string[]) || [];
  const out: Record<string, number> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = Number(flat[i + 1]) || 0;
  return out;
}
const ranked = (m: Record<string, number>, n = 12) =>
  Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));

export const visitsRouter = Router();

visitsRouter.get("/owner/visits", async (req: Request, res: Response) => {
  if (!isOwner(req)) return res.status(403).json({ error: "forbidden" });
  if (!getStore()) return res.status(503).json({ error: "no store" });
  const [views, uniq, fresh, calls, chats, hours, totals, countries, cities, devices, oses, sources, langs] = await Promise.all(
    ["views", "uniq", "new", "calls", "chats", "hours", "totals", "countries", "cities", "devices", "os", "sources", "langs"].map((k) => hash(`visits:${k}`))
  );
  // The last 30 days, oldest first (days without visits show as 0)
  const days: { day: string; people: number; views: number; fresh: number; calls: number; chats: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = riyadhDay(Date.now() - i * 86_400_000);
    days.push({ day: d, people: uniq[d] || 0, views: views[d] || 0, fresh: fresh[d] || 0, calls: calls[d] || 0, chats: chats[d] || 0 });
  }
  const firstDay = Object.keys(views).sort()[0] || null;
  res.set("Cache-Control", "no-store").json({
    today: riyadhDay(),
    firstDay,
    days,
    totals: { people: totals.people || 0, views: totals.views || 0 },
    hours: Array.from({ length: 24 }, (_, h) => hours[String(h)] || 0),
    countries: ranked(countries),
    cities: ranked(cities),
    devices: ranked(devices),
    os: ranked(oses),
    sources: ranked(sources),
    langs: ranked(langs),
  });
});
