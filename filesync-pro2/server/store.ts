// Where «الداهية» keeps what must survive a restart (question counts, taught words, the owner's rules).
// Same small set of Redis-style hash commands everywhere:
//  - on Cloudflare: the D1 database bound as DB (useD1() is called by the worker);
//  - on Render: the Key Value (Redis) instance at REDIS_URL;
//  - otherwise nothing (memory only).
import net from "node:net";

export interface Store {
  command(args: string[]): Promise<unknown>;
}

let d1: any = null;
let d1Store: Store | null = null;
let redis: Store | null | undefined;

export function useD1(db: any) {
  if (!db || d1 === db) return;
  d1 = db;
  let ready: Promise<unknown> | null = null;
  const init = () =>
    (ready ||= db.prepare("CREATE TABLE IF NOT EXISTS kv (h TEXT NOT NULL, k TEXT NOT NULL, v TEXT NOT NULL, PRIMARY KEY (h, k))").run());
  d1Store = {
    async command([cmd, h, k, v]: string[]) {
      await init();
      switch (cmd.toUpperCase()) {
        case "HINCRBY":
          await db
            .prepare("INSERT INTO kv (h, k, v) VALUES (?1, ?2, ?3) ON CONFLICT (h, k) DO UPDATE SET v = CAST(CAST(v AS INTEGER) + CAST(?3 AS INTEGER) AS TEXT)")
            .bind(h, k, String(v ?? "1"))
            .run();
          return 1;
        case "HSETNX":
          await db.prepare("INSERT OR IGNORE INTO kv (h, k, v) VALUES (?1, ?2, ?3)").bind(h, k, v).run();
          return 1;
        case "HSET":
          await db.prepare("INSERT INTO kv (h, k, v) VALUES (?1, ?2, ?3) ON CONFLICT (h, k) DO UPDATE SET v = excluded.v").bind(h, k, v).run();
          return 1;
        case "HDEL":
          await db.prepare("DELETE FROM kv WHERE h = ?1 AND k = ?2").bind(h, k).run();
          return 1;
        case "HGETALL": {
          const { results } = await db.prepare("SELECT k, v FROM kv WHERE h = ?1").bind(h).all();
          return (results || []).flatMap((r: any) => [String(r.k), String(r.v)]);
        }
        case "KEYS": {
          const { results } = await db.prepare("SELECT DISTINCT h FROM kv").all();
          return (results || []).map((r: any) => String(r.h));
        }
        default:
          throw new Error(`Unsupported command ${cmd}`);
      }
    },
  };
}

/** The store to use now, or null (memory only). */
export function getStore(): Store | null {
  if (d1Store) return d1Store;
  if (redis === undefined) {
    try {
      redis = process.env.REDIS_URL ? new MiniRedis(new URL(process.env.REDIS_URL)) : null;
    } catch {
      redis = null;
    }
  }
  return redis;
}

// ───────────── tiny Redis client (no dependency): HINCRBY / HGETALL ─────────────
export class MiniRedis {
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

