// News from the season's official X account (@QASABSALTSEASON) for «الداهية».
// Every 30 minutes (Cloudflare cron) the worker asks the X API for posts newer than the last one it
// has («since_id», so X only bills new posts: $0.005 each on pay-per-use). The posts are kept in the
// store (hash "xnews") and the latest ones go into the chat and the call as «أخبار الحساب الرسمي».
// Needs the secret X_BEARER_TOKEN (the owner's X developer app); without it nothing runs.
import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { getStore } from "./store.ts";

const ACCOUNT = "QASABSALTSEASON";
const H = "xnews";
const KEEP = 30;

type Post = { id: string; text: string; at: string };

async function x(path: string): Promise<any> {
  const token = process.env.X_BEARER_TOKEN || "";
  const r = await fetch(`https://api.x.com/2/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`X ${r.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

/** Fetch the account's new posts (no retweets or replies). Returns how many were new. */
export async function refreshXNews(): Promise<{ added: number; status: string }> {
  const store = getStore();
  if (!process.env.X_BEARER_TOKEN) return { added: 0, status: "no-token" };
  if (!store) return { added: 0, status: "no-store" };
  try {
    let userId = String((await store.command(["HGET", `${H}:meta`, "userId"])) || "");
    if (!userId) {
      userId = String((await x(`users/by/username/${ACCOUNT}`))?.data?.id || "");
      if (!userId) throw new Error("account not found");
      await store.command(["HSET", `${H}:meta`, "userId", userId]);
    }
    const since = String((await store.command(["HGET", `${H}:meta`, "sinceId"])) || "");
    const q = new URLSearchParams({ max_results: "10", exclude: "retweets,replies", "tweet.fields": "created_at,note_tweet" });
    if (since) q.set("since_id", since);
    const res = await x(`users/${userId}/tweets?${q}`);
    const posts: Post[] = (res?.data || []).map((t: any) => ({
      id: String(t.id),
      text: String(t.note_tweet?.text || t.text || "").replace(/https:\/\/t\.co\/\S+/g, "").trim(),
      at: String(t.created_at || ""),
    }));
    for (const p of posts) await store.command(["HSET", H, p.id, JSON.stringify(p)]);
    const newest = res?.meta?.newest_id;
    if (newest) await store.command(["HSET", `${H}:meta`, "sinceId", String(newest)]);
    await store.command(["HSET", `${H}:meta`, "checkedAt", new Date().toISOString()]);
    // keep only the latest KEEP posts
    const all = await latestXNews(1000);
    for (const old of all.slice(KEEP)) await store.command(["HDEL", H, old.id]);
    cache = null;
    return { added: posts.length, status: "ok" };
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 200);
    console.warn(`[X news] ${msg}`);
    await store.command(["HSET", `${H}:meta`, "error", `${new Date().toISOString()} ${msg}`]).catch(() => {});
    return { added: 0, status: msg };
  }
}

let cache: { at: number; posts: Post[] } | null = null;
/** Latest posts, newest first (kept 2 minutes in memory). */
export async function latestXNews(n = 8): Promise<Post[]> {
  if (cache && Date.now() - cache.at < 120_000 && n <= cache.posts.length) return cache.posts.slice(0, n);
  const flat = ((await getStore()?.command(["HGETALL", H])) as string[]) || [];
  const posts: Post[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    try { posts.push(JSON.parse(flat[i + 1])); } catch {}
  }
  posts.sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1));
  cache = { at: Date.now(), posts };
  return posts.slice(0, n);
}

/** The block added to the chat and call instructions (empty when there are no posts). */
export async function xNewsBlock(lang: "ar" | "en" | "auto", n = 8): Promise<string> {
  let posts: Post[] = [];
  try { posts = await latestXNews(n); } catch { return ""; }
  if (!posts.length) return "";
  const when = (iso: string) => {
    const d = new Date(new Date(iso).getTime() + 3 * 3600_000);
    return isNaN(d.getTime()) ? "" : `${d.getUTCDate()}/${d.getUTCMonth() + 1} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  };
  const lines = posts.map((p) => `- (${when(p.at)}) ${p.text.replace(/\s+/g, " ").slice(0, 400)}`).join("\n");
  return lang === "en"
    ? `LATEST NEWS from the season's official X account @${ACCOUNT} (newest first, Riyadh time). Use it for news and announcements and say it is from the official account. The visitor guide stays the source for the events and their times; only if a post here announces a change to an event (moved, cancelled, added) mention that change, citing the official account:\n${lines}`
    : `آخر أخبار الحساب الرسمي لموسم ملح القصب في إكس @${ACCOUNT} (الأحدث أول، بتوقيت الرياض). استخدمها للأخبار والإعلانات وقل إنها من الحساب الرسمي. الفعاليات وأوقاتها مصدرها دليل الزائر، وما تاخذ منها إلا إذا تغريدة هنا أعلنت تغيير في فعالية (تأجيل، إلغاء، إضافة)، فتذكر التغيير وتقول إنه من الحساب الرسمي:\n${lines}`;
}

function isOwner(req: Request): boolean {
  const expected = process.env.STATS_KEY || "";
  const given = String(req.headers["x-stats-key"] || "");
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export const xNewsRouter = Router();
// Owner: see what was fetched, and fetch now
xNewsRouter.get("/owner/xnews", async (req: Request, res: Response) => {
  if (!isOwner(req)) return res.status(403).json({ error: "forbidden" });
  const meta = ((await getStore()?.command(["HGETALL", `${H}:meta`])) as string[]) || [];
  res.set("Cache-Control", "no-store").json({ token: !!process.env.X_BEARER_TOKEN, meta, posts: await latestXNews(KEEP) });
});
xNewsRouter.post("/owner/xnews/refresh", async (req: Request, res: Response) => {
  if (!isOwner(req)) return res.status(403).json({ error: "forbidden" });
  res.json(await refreshXNews());
});
