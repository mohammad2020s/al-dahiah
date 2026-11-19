// «شارك لقطتك من الموسم»: visitors upload their own photo from the season; it shows in the site's
// gallery only after the owner approves it on /shots. Photos arrive already shrunk by the page
// (JPEG, ≤1600 px, and a 480 px thumbnail; re-drawing drops the GPS and other EXIF data).
// Kept in D1 in their own table (base64 JPEG). Visitors can't see a photo until it's approved.
import { Router, type Request, type Response } from "express";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { getD1 } from "./store.ts";
import { createLimiter, clientIp } from "./rateLimit.ts";

const MAX_FULL = 1_400_000; // base64 characters (~1 MB JPEG)
const MAX_THUMB = 160_000;
const upLimit = createLimiter({ windowMs: 60 * 60_000, max: 5 }); // 5 photos an hour per visitor

let ready: Promise<unknown> | null = null;
function db() {
  const d = getD1();
  if (!d) return null;
  ready ||= d
    .prepare(
      "CREATE TABLE IF NOT EXISTS shots (id TEXT PRIMARY KEY, at TEXT NOT NULL, name TEXT, caption TEXT, status TEXT NOT NULL, thumb TEXT NOT NULL, full TEXT NOT NULL)"
    )
    .run();
  return d;
}

function isOwner(req: Request): boolean {
  const expected = process.env.STATS_KEY || "";
  const given = String(req.headers["x-stats-key"] || req.query.key || "");
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const clean = (v: unknown, max: number) =>
  String(v ?? "").replace(/[\u0000-\u001F\u007F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const jpeg = (v: unknown, max: number) => {
  const s = String(v || "").replace(/^data:image\/jpeg;base64,/, "");
  return s.startsWith("/9j/") && s.length <= max && /^[A-Za-z0-9+/=]+$/.test(s.slice(0, 2000)) ? s : "";
};

export const shotsRouter = Router();

// A visitor sends a photo (waits for the owner's approval)
shotsRouter.post("/shots", async (req: Request, res: Response) => {
  const en = req.body?.lang === "en";
  const d = db();
  if (!d) return res.status(503).json({ error: en ? "Not available right now." : "مو متاح الحين." });
  if (req.body?.consent !== true) return res.status(400).json({ error: en ? "Please confirm the photo is yours." : "أكّد إن الصورة لك وتوافق تنعرض." });
  const full = jpeg(req.body?.full, MAX_FULL), thumb = jpeg(req.body?.thumb, MAX_THUMB);
  if (!full || !thumb) return res.status(400).json({ error: en ? "That photo couldn't be read, try another one." : "ما قدرت أقرا الصورة، جرّب صورة ثانية." });
  if (!upLimit(clientIp(req)).ok) return res.status(429).json({ error: en ? "You've shared several photos, try again later." : "أرسلت كذا صورة، جرّب بعد شوي." });
  await ready;
  await d
    .prepare("INSERT INTO shots (id, at, name, caption, status, thumb, full) VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6)")
    .bind(randomUUID().replace(/-/g, "").slice(0, 16), new Date().toISOString(), clean(req.body?.name, 40), clean(req.body?.caption, 120), thumb, full)
    .run();
  res.json({ ok: true });
});

// The gallery: approved photos, newest first
shotsRouter.get("/shots", async (_req: Request, res: Response) => {
  const d = db();
  if (!d) return res.json({ items: [] });
  await ready;
  const { results } = await d.prepare("SELECT id, at, name, caption FROM shots WHERE status = 'approved' ORDER BY at DESC LIMIT 60").all();
  res.set("Cache-Control", "public, max-age=60").json({ items: results || [] });
});

// A photo (approved only, unless it's the owner looking)
shotsRouter.get("/shots/:id/:size", async (req: Request, res: Response) => {
  const d = db();
  const size = req.params.size === "full" ? "full" : "thumb";
  if (!d || !/^[a-f0-9]{16}$/.test(req.params.id)) return res.status(404).end();
  await ready;
  const row: any = await d.prepare(`SELECT status, ${size} AS img FROM shots WHERE id = ?1`).bind(req.params.id).first();
  if (!row || (row.status !== "approved" && !isOwner(req))) return res.status(404).end();
  res
    .set({ "Content-Type": "image/jpeg", "Cache-Control": row.status === "approved" ? "public, max-age=86400" : "no-store" })
    .send(Buffer.from(row.img, "base64"));
});

// Owner: everything waiting or shown, and approve / hide / delete
shotsRouter.get("/owner/shots", async (req: Request, res: Response) => {
  if (!isOwner(req)) return res.status(403).json({ error: "forbidden" });
  const d = db();
  if (!d) return res.json({ items: [] });
  await ready;
  const { results } = await d.prepare("SELECT id, at, name, caption, status FROM shots WHERE status != 'deleted' ORDER BY status = 'pending' DESC, at DESC LIMIT 200").all();
  res.set("Cache-Control", "no-store").json({ items: results || [] });
});
shotsRouter.post("/owner/shots/:id", async (req: Request, res: Response) => {
  if (!isOwner(req)) return res.status(403).json({ error: "forbidden" });
  const d = db();
  const action = String(req.body?.action || "");
  if (!d || !/^[a-f0-9]{16}$/.test(req.params.id)) return res.status(400).json({ error: "bad id" });
  await ready;
  if (action === "delete") await d.prepare("DELETE FROM shots WHERE id = ?1").bind(req.params.id).run();
  else if (action === "approve" || action === "pending") await d.prepare("UPDATE shots SET status = ?2 WHERE id = ?1").bind(req.params.id, action === "approve" ? "approved" : "pending").run();
  else return res.status(400).json({ error: "bad action" });
  res.json({ ok: true });
});
