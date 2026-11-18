// «راسلني»: visitors write to the site's owner from inside the site. The owner's address is never sent
// to the page (and is not in this public repository): it is the secret OWNER_EMAIL in Cloudflare.
//  - Every message is kept in the database (hash "dahiah:inbox") and shows on the owner's page /inbox.
//  - When Cloudflare Email Routing is on (binding SEND_EMAIL + secret OWNER_EMAIL), it is also emailed
//    to the owner, subject «رسالة من موقع الداهية», with Reply-To set to the visitor's email if given.
import { Router, type Request, type Response } from "express";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { EmailMessage } from "cloudflare:email";
import { getStore } from "./store.ts";
import { createLimiter, clientIp } from "./rateLimit.ts";

const INBOX = "dahiah:inbox";
const FROM = "contact@al-dahiah.com";

let mailBinding: { send(m: unknown): Promise<void> } | null = null;
/** The worker hands over its SEND_EMAIL binding (absent until Email Routing is set up). */
export function setMailBinding(b: unknown) {
  mailBinding = b && typeof (b as any).send === "function" ? (b as any) : null;
}

// A few messages per visitor: 3 per 10 minutes, 10 per day
const shortLimit = createLimiter({ windowMs: 10 * 60_000, max: 3 });
const dayLimit = createLimiter({ windowMs: 24 * 60 * 60_000, max: 10 });

const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ");
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

function isOwner(req: Request): boolean {
  const expected = process.env.STATS_KEY || "";
  const given = String(req.headers["x-stats-key"] || "");
  return expected.length > 0 && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const word = (s: string) => `=?UTF-8?B?${b64(s)}?=`;

async function mailOwner(m: { name: string; contact: string; message: string; lang: string; at: string }): Promise<string> {
  const to = (process.env.OWNER_EMAIL || "").trim();
  if (!mailBinding) return "no-binding";
  if (!EMAIL_RE.test(to)) return "no-owner-email";
  const replyTo = EMAIL_RE.test(m.contact) ? m.contact : "";
  const subject = `رسالة من موقع الداهية${m.name ? ` — ${oneLine(m.name)}` : ""}`;
  const body = [
    "رسالة جديدة من زائر في موقع الداهية (al-dahiah.com):",
    "",
    m.message,
    "",
    "──────────",
    `الاسم: ${m.name || "(ما كتب اسمه)"}`,
    `للرد عليه: ${m.contact || "(ما كتب وسيلة تواصل)"}`,
    `لغة الموقع: ${m.lang === "en" ? "English" : "العربي"}`,
    `الوقت: ${new Date(m.at).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}`,
    "",
    replyTo
      ? "تنبيه: لو ضغطت «رد» من إيميلك، بيشوف الزائر إيميلك."
      : "",
  ].join("\n");
  const raw = [
    `From: ${word("موقع الداهية")} <${FROM}>`,
    `To: <${to}>`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${word(subject)}`,
    `Message-ID: <${randomUUID()}@al-dahiah.com>`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(body).replace(/.{76}/g, "$&\r\n"),
  ].join("\r\n");
  await mailBinding.send(new EmailMessage(FROM, to, raw));
  return "sent";
}

export const contactRouter = Router();

contactRouter.post("/contact", async (req: Request, res: Response) => {
  const en = req.body?.lang === "en";
  // Bots fill every field: the hidden «website» field must stay empty
  if (clean(req.body?.website, 200)) return res.json({ ok: true });
  const name = oneLine(clean(req.body?.name, 80));
  const contact = oneLine(clean(req.body?.contact, 120));
  const message = clean(req.body?.message, 2000);
  if (message.length < 3) {
    return res.status(400).json({ error: en ? "Please write your message." : "اكتب رسالتك أول." });
  }
  const ip = clientIp(req);
  if (!shortLimit(ip).ok || !dayLimit(ip).ok) {
    return res.status(429).json({ error: en ? "You've sent several messages already, please try again later." : "أرسلت كذا رسالة، جرّب بعد شوي." });
  }
  const at = new Date().toISOString();
  const entry = { at, name, contact, message, lang: en ? "en" : "ar", mail: "pending" };
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const store = getStore();
  try {
    entry.mail = await mailOwner(entry);
  } catch (e: any) {
    entry.mail = `failed: ${String(e?.message || e).slice(0, 160)}`;
    console.warn(`[Contact] email failed: ${entry.mail}`);
  }
  if (store) {
    try {
      await store.command(["HSET", INBOX, id, JSON.stringify(entry)]);
    } catch (e: any) {
      console.warn(`[Contact] could not save: ${String(e?.message || e)}`);
      if (entry.mail !== "sent") return res.status(500).json({ error: en ? "Couldn't send it, please try again." : "ما قدرت أرسلها، جرّب مرة ثانية." });
    }
  } else if (entry.mail !== "sent") {
    return res.status(503).json({ error: en ? "Messages are not available right now." : "الرسائل مو متاحة الحين." });
  }
  res.json({ ok: true });
});

// Owner: read and delete the messages (page /inbox)
contactRouter.get("/owner/inbox", async (req: Request, res: Response) => {
  if (!isOwner(req)) return res.status(403).json({ error: "forbidden" });
  const store = getStore();
  const flat = store ? ((await store.command(["HGETALL", INBOX])) as string[]) || [] : [];
  const items: any[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    try {
      items.push({ id: flat[i], ...JSON.parse(flat[i + 1]) });
    } catch {}
  }
  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  res.set("Cache-Control", "no-store").json({
    items,
    email: mailBinding ? (EMAIL_RE.test((process.env.OWNER_EMAIL || "").trim()) ? "on" : "no-owner-email") : "off",
  });
});

contactRouter.post("/owner/inbox/delete", async (req: Request, res: Response) => {
  if (!isOwner(req)) return res.status(403).json({ error: "forbidden" });
  const id = clean(req.body?.id, 60);
  const store = getStore();
  if (!id || !store) return res.status(400).json({ error: "bad id" });
  await store.command(["HDEL", INBOX, id]);
  res.json({ ok: true });
});

export const INBOX_PAGE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>رسائل الزوار - الداهية</title>
<link rel="icon" href="/images/logo.png" />
<style>
  :root { --brand:#a5492a; --ink:#3f2a22; --muted:#85695a; --line:#e2d5c6; --bg:#f1e7da; --card:#fffdf9; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.7 "IBM Plex Sans Arabic", system-ui, "Segoe UI", Tahoma, sans-serif; }
  .wrap { max-width:760px; margin:0 auto; padding:20px 16px 48px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:var(--muted); font-size:13px; margin:0 0 16px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:14px 16px; margin-bottom:12px; }
  .meta { display:flex; flex-wrap:wrap; gap:6px 14px; color:var(--muted); font-size:13px; margin-bottom:6px; }
  .meta b { color:var(--ink); }
  .msg { white-space:pre-wrap; overflow-wrap:anywhere; }
  .row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
  button, input { font:inherit; }
  button { border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:12px; padding:6px 12px; cursor:pointer; }
  button.main { background:var(--brand); border-color:var(--brand); color:#fff; font-weight:700; }
  input { flex:1; min-width:0; border:1px solid var(--line); border-radius:12px; padding:8px 12px; background:#fff; }
  .note { font-size:13px; border-radius:12px; padding:8px 12px; margin-bottom:12px; background:#fbf6ee; border:1px solid var(--line); }
  .empty { color:var(--muted); text-align:center; padding:24px 0; }
  .err { color:#b42318; font-size:13px; min-height:1.2em; }
  .hidden { display:none; }
  a { color:var(--brand); }
</style>
</head>
<body>
<div class="wrap">
  <h1>رسائل الزوار</h1>
  <p class="sub">اللي أرسلوه من زر «راسلني» تحت صفحة الموقع. إيميلك ما يظهر لهم أبداً.</p>
  <div id="login" class="card hidden">
    <div>اكتب رمز صاحب الموقع (نفس رمز صفحة التعليم):</div>
    <div class="row"><input id="key" type="password" autocomplete="off" /><button class="main" id="go">دخول</button></div>
    <div class="err" id="err"></div>
  </div>
  <div id="data" class="hidden">
    <div class="note" id="mailNote"></div>
    <div class="row" style="margin:0 0 12px"><button id="reload">تحديث</button><button id="logout">خروج</button></div>
    <div id="list"></div>
  </div>
</div>
<script>
(function () {
  var K = "dahiah:ownerKey";
  function $(id) { return document.getElementById(id); }
  function key() { try { return localStorage.getItem(K) || ""; } catch (e) { return ""; } }
  function setKey(v) { try { v ? localStorage.setItem(K, v) : localStorage.removeItem(K); } catch (e) {} }
  function when(iso) { try { return new Date(iso).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }); } catch (e) { return iso; } }
  function showLogin(msg) { $("login").classList.remove("hidden"); $("data").classList.add("hidden"); $("err").textContent = msg || ""; }
  function load(k) {
    fetch("/api/owner/inbox", { headers: { "x-stats-key": k } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { setKey(""); return showLogin("الرمز غلط."); }
        setKey(k);
        $("login").classList.add("hidden"); $("data").classList.remove("hidden");
        $("mailNote").textContent = res.j.email === "on"
          ? "✅ الرسائل توصلك على إيميلك بعد، وتنحفظ هنا."
          : "📥 الرسائل تنحفظ هنا. (توصيلها لإيميلك يشتغل بعد ما يتفعّل Email Routing في Cloudflare.)";
        var list = $("list"); list.innerHTML = "";
        if (!res.j.items.length) { list.innerHTML = '<div class="empty">ما فيه رسائل للحين.</div>'; return; }
        res.j.items.forEach(function (m) {
          var c = document.createElement("div"); c.className = "card";
          var meta = document.createElement("div"); meta.className = "meta";
          var who = document.createElement("span"); who.innerHTML = "من: "; var b = document.createElement("b"); b.textContent = m.name || "(بدون اسم)"; who.appendChild(b);
          var con = document.createElement("span"); con.textContent = "للرد: " + (m.contact || "(ما كتب)");
          var t = document.createElement("span"); t.textContent = when(m.at);
          meta.appendChild(who); meta.appendChild(con); meta.appendChild(t);
          var msg = document.createElement("div"); msg.className = "msg"; msg.textContent = m.message;
          var row = document.createElement("div"); row.className = "row";
          var del = document.createElement("button"); del.textContent = "حذف";
          del.onclick = function () {
            del.disabled = true;
            fetch("/api/owner/inbox/delete", { method: "POST", headers: { "content-type": "application/json", "x-stats-key": key() }, body: JSON.stringify({ id: m.id }) })
              .then(function () { c.remove(); });
          };
          row.appendChild(del);
          c.appendChild(meta); c.appendChild(msg); c.appendChild(row);
          list.appendChild(c);
        });
      })
      .catch(function () { showLogin("ما قدرت أفتح الرسائل، جرّب مرة ثانية."); });
  }
  $("go").onclick = function () { var v = $("key").value.trim(); if (v) load(v); };
  $("key").onkeydown = function (e) { if (e.key === "Enter") $("go").onclick(); };
  $("reload").onclick = function () { load(key()); };
  $("logout").onclick = function () { setKey(""); showLogin(""); };
  if (key()) load(key()); else showLogin("");
})();
</script>
</body>
</html>`;
