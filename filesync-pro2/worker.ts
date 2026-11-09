// «الداهية» on Cloudflare Workers.
//  - The site itself (dist/, built by Vite) is served by Cloudflare's static assets.
//  - /api/*, /stats and /stamps run the same Express app as on Render (Node HTTP support in Workers).
//  - /live is the voice call: the page's WebSocket and Gemini Live's, joined by runCall().
//  - Saved data (question counts, taught words, the owner's rules) lives in the D1 database "DB".
import { httpServerHandler } from "cloudflare:node";
import express from "express";
import { apiRouter } from "./server/api.ts";
import { STATS_PAGE_HTML } from "./server/statsPage.ts";
import { STAMPS_PAGE_HTML } from "./server/stampsPage.ts";
import { runCall, type Sock } from "./server/live-audio.ts";
import { useD1, getStore } from "./server/store.ts";
import { refreshMemory, loadTaught, loadRules } from "./server/pronMemory.ts";
import { createLimiter } from "./server/rateLimit.ts";

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
  DB: any;
  [k: string]: unknown;
}

// ───────────── Express: the same API as on Render ─────────────
const app = express();
app.set("trust proxy", true);
// Request bodies (JSON or form). Express's own parsers (body-parser → iconv-lite) do not load on
// Workers, so a small reader instead. 8 MB: room for a visitor's photo («صوّر واسأل»).
app.use((req, res, next) => {
  const type = String(req.headers["content-type"] || "");
  if (!/json|x-www-form-urlencoded/.test(type) || req.method === "GET" || req.method === "HEAD") return next();
  const chunks: Buffer[] = [];
  let size = 0;
  let done = false;
  req.on("data", (c: Buffer) => {
    size += c.length;
    if (size > 8 * 1024 * 1024 && !done) {
      done = true;
      res.status(413).json({ error: "Too large" });
      return;
    }
    chunks.push(c);
  });
  req.on("end", () => {
    if (done) return;
    done = true;
    const raw = Buffer.concat(chunks).toString("utf8");
    try {
      (req as any).body = type.includes("json") ? (raw.trim() ? JSON.parse(raw) : {}) : Object.fromEntries(new URLSearchParams(raw));
    } catch {
      res.status(400).json({ error: "Bad JSON" });
      return;
    }
    next();
  });
  req.on("error", (e) => {
    if (!done) {
      done = true;
      next(e);
    }
  });
});
app.use("/api", apiRouter);
const ownerPage = (html: string) => (_req: express.Request, res: express.Response) => {
  res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" }).send(html);
};
app.get("/stats", ownerPage(STATS_PAGE_HTML));
app.get("/stamps", ownerPage(STAMPS_PAGE_HTML));
app.listen(3000);
const expressHandler = httpServerHandler({ port: 3000 });

// ───────────── voice calls ─────────────
const OPEN = 1;
// A WebSocket frame as text: a string, bytes (ArrayBuffer / typed array) or a Blob
async function asText(d: any): Promise<string> {
  if (typeof d === "string") return d;
  if (d && typeof d.arrayBuffer === "function" && !(d instanceof ArrayBuffer)) return Buffer.from(await d.arrayBuffer()).toString("utf8");
  if (ArrayBuffer.isView(d)) return Buffer.from(d.buffer, d.byteOffset, d.byteLength).toString("utf8");
  return Buffer.from(d as ArrayBuffer).toString("utf8");
}
/** Calls cb with each frame's text, in arrival order even when a frame needs async decoding. */
function inOrder(cb: (t: string) => void) {
  let chain: Promise<void> = Promise.resolve();
  return (e: MessageEvent) => {
    chain = chain.then(() => asText(e.data)).then(cb, (err) => console.warn("[Live Audio] could not read a frame:", String(err?.message || err)));
  };
}

/** The caller's side of the call (already open). */
function wrapAccepted(ws: WebSocket): Sock {
  return {
    send: (t) => {
      try { ws.send(t); } catch {}
    },
    close: (code) => {
      try { ws.close(code || 1000); } catch {}
    },
    isOpen: () => ws.readyState === OPEN,
    onOpen: (cb) => queueMicrotask(cb),
    onMessage: (cb) => ws.addEventListener("message", inOrder(cb)),
    onClose: (cb) => ws.addEventListener("close", (e: CloseEvent) => cb(e.code, e.reason || "")),
    onError: (cb) => ws.addEventListener("error", (e: any) => cb(String(e?.message || "error"))),
  };
}

/** Gemini Live's side: an outgoing WebSocket, opened with fetch + Upgrade. */
function openOutbound(url: string): Sock {
  let ws: WebSocket | null = null;
  let closed = false;
  const on = { open: [] as (() => void)[], message: [] as ((t: string) => void)[], close: [] as ((c: number, r: string) => void)[], error: [] as ((m: string) => void)[] };
  const fail = (msg: string, code = 1006, reason = "") => {
    on.error.forEach((f) => f(msg));
    on.close.forEach((f) => f(code, reason || msg));
  };
  (async () => {
    try {
      const resp = await fetch(url.replace(/^wss:/, "https:"), { headers: { Upgrade: "websocket" } });
      const sock = (resp as any).webSocket as WebSocket | null;
      if (!sock) {
        const body = await resp.text().catch(() => "");
        return fail(`HTTP ${resp.status}`, 1006, body.slice(0, 200));
      }
      sock.accept();
      ws = sock;
      if (closed) return sock.close(1000);
      sock.addEventListener("message", inOrder((t) => on.message.forEach((f) => f(t))));
      sock.addEventListener("close", (e: CloseEvent) => on.close.forEach((f) => f(e.code, e.reason || "")));
      sock.addEventListener("error", (e: any) => on.error.forEach((f) => f(String(e?.message || "error"))));
      on.open.forEach((f) => f());
    } catch (e: any) {
      fail(String(e?.message || e));
    }
  })();
  return {
    send: (t) => {
      try { ws?.send(t); } catch {}
    },
    close: (code) => {
      closed = true;
      try { ws?.close(code || 1000); } catch {}
    },
    isOpen: () => !!ws && ws.readyState === OPEN,
    onOpen: (cb) => void on.open.push(cb),
    onMessage: (cb) => void on.message.push(cb),
    onClose: (cb) => void on.close.push(cb),
    onError: (cb) => void on.error.push(cb),
  };
}

// Voice calls cost the most: at most 6 new calls per 10 minutes and 2 at once per visitor
const callStartLimit = createLimiter({ windowMs: 10 * 60_000, max: 6 });
const openCalls = new Map<string, number>();

function liveCall(request: Request, url: URL): Response {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if ((openCalls.get(ip) || 0) >= 2 || !callStartLimit(ip).ok) {
    console.warn(`[Live Audio] Rate limited ${ip}`);
    return new Response("Too Many Requests", { status: 429 });
  }
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
  server.accept();
  openCalls.set(ip, (openCalls.get(ip) || 0) + 1);
  server.addEventListener("close", () => {
    const n = (openCalls.get(ip) || 1) - 1;
    if (n <= 0) openCalls.delete(ip);
    else openCalls.set(ip, n);
  });
  runCall(wrapAccepted(server), url, openOutbound);
  return new Response(null, { status: 101, webSocket: client } as ResponseInit);
}

// ───────────── one-time move of the saved data from Render ─────────────
// Taught words, the owner's rules and the question counts lived in Render's Key Value. The first
// requests here copy them over once (server to server, with the owner key both sides already have).
let migrating = false;
async function migrateFromRender(env: Env) {
  const key = typeof env.STATS_KEY === "string" ? env.STATS_KEY : "";
  const store = getStore();
  if (migrating || !key || !env.DB || !store) return;
  migrating = true;
  try {
    const meta = ((await store.command(["HGETALL", "dahiah:meta"])) as string[]) || [];
    if (meta.includes("migratedFromRender")) return;
    const r = await fetch("https://al-dahiah.onrender.com/api/owner/export", { headers: { "x-stats-key": key } });
    if (!r.ok) {
      console.warn(`[Migrate] Render export failed: HTTP ${r.status}`);
      migrating = false;
      return;
    }
    const { hashes } = (await r.json()) as { hashes: Record<string, Record<string, string>> };
    const stmts: any[] = [];
    for (const [h, m] of Object.entries(hashes || {})) {
      if (!/^(qstats:|dahiah:)/.test(h)) continue;
      for (const [k, v] of Object.entries(m || {})) {
        stmts.push(env.DB.prepare("INSERT INTO kv (h, k, v) VALUES (?1, ?2, ?3) ON CONFLICT (h, k) DO UPDATE SET v = excluded.v").bind(h, k, String(v)));
      }
    }
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    await store.command(["HSET", "dahiah:meta", "migratedFromRender", `${new Date().toISOString()} (${stmts.length})`]);
    await Promise.all([loadTaught(), loadRules()]);
    console.log(`[Migrate] copied ${stmts.length} saved entries from Render`);
  } catch (e: any) {
    console.warn(`[Migrate] failed: ${String(e?.message || e).slice(0, 200)}`);
    migrating = false;
  }
}

// ───────────── entry ─────────────
let memoryLoaded = false;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    useD1(env.DB);
    // Plain settings and secrets also as process.env (the shared server code reads them there)
    for (const [k, v] of Object.entries(env)) if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v;
    const url = new URL(request.url);
    const dynamic = url.pathname === "/live" || url.pathname.startsWith("/api/") || url.pathname === "/stats" || url.pathname === "/stamps";
    if (!dynamic) return env.ASSETS.fetch(request);

    // Until the Gemini key is added here as a secret, the chat, the call and the owner pages are
    // answered by the Render server (which has the keys); the site itself is still served from here.
    if (!env.GEMINI_API_KEY) {
      const target = new URL(url.pathname + url.search, "https://al-dahiah.onrender.com");
      // Only the headers the API needs: Cloudflare's own cf-* headers must not be passed to another site
      const headers = new Headers();
      for (const [k, v] of request.headers) {
        if (/^(content-type|accept|accept-language|user-agent|x-stats-key|upgrade|connection|sec-websocket-.*)$/i.test(k)) headers.set(k, v);
      }
      headers.set("X-Forwarded-For", request.headers.get("cf-connecting-ip") || "");
      return fetch(new Request(target.toString(), { method: request.method, headers, body: request.body, redirect: "manual" }));
    }

    if (env.GEMINI_API_KEY) ctx.waitUntil(migrateFromRender(env));

    // The owner's taught words and rules: loaded before the first answer, refreshed every 5 minutes
    if (!memoryLoaded) {
      await refreshMemory().catch(() => {});
      memoryLoaded = true;
    } else {
      ctx.waitUntil(refreshMemory().catch(() => {}));
    }

    if (url.pathname === "/live") return liveCall(request, url);
    return expressHandler.fetch!(request as any, env as any, ctx);
  },
};
