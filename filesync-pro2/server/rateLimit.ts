import type { Request, Response, NextFunction } from "express";
import type { IncomingMessage } from "http";

// Small in-memory, per-IP limiter (one Render instance, so memory is enough).
// It keeps the Gemini key from being drained by a script hammering the endpoints.

interface Window {
  count: number;
  resetAt: number;
}

export function createLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, Window>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, w] of hits) if (w.resetAt <= now) hits.delete(key);
  }, windowMs).unref();

  return function check(key: string): { ok: boolean; retryAfterSec: number } {
    const now = Date.now();
    let w = hits.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowMs };
      hits.set(key, w);
    }
    w.count += 1;
    return { ok: w.count <= max, retryAfterSec: Math.ceil((w.resetAt - now) / 1000) };
  };
}

/** Client IP behind Render's proxy (first X-Forwarded-For entry). */
export function clientIp(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd || "").split(",")[0].trim();
  return first || req.socket.remoteAddress || "unknown";
}

export function rateLimitMiddleware(opts: { windowMs: number; max: number; messageAr: string; messageEn: string }) {
  const check = createLimiter(opts);
  return (req: Request, res: Response, next: NextFunction) => {
    const { ok, retryAfterSec } = check(clientIp(req));
    if (ok) return next();
    res.setHeader("Retry-After", String(retryAfterSec));
    const en = req.body?.language === "en";
    res.status(429).json({ error: en ? opts.messageEn : opts.messageAr, retryAfterSec });
  };
}
