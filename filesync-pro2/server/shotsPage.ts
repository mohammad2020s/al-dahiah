// Owner page at /shots: approve visitors' photos before they show in the site's gallery.
export const SHOTS_PAGE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>لقطات الزوار - الداهية</title>
<link rel="icon" href="/images/logo.png" />
<style>
  :root { --brand:#a5492a; --ink:#3f2a22; --muted:#6f5446; --line:#e2d5c6; --bg:#f1e7da; --card:#fffdf9; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 "IBM Plex Sans Arabic", system-ui, "Segoe UI", Tahoma, sans-serif; }
  .wrap { max-width:900px; margin:0 auto; padding:20px 16px 48px; }
  h1 { font-size:22px; margin:0 0 4px; }
  h2 { font-size:16px; margin:20px 0 10px; }
  .sub { color:var(--muted); font-size:13px; margin:0 0 14px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:12px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; }
  .card img { width:100%; aspect-ratio:1; object-fit:cover; display:block; background:#eadfce; cursor:zoom-in; }
  .meta { padding:8px 10px 0; font-size:13px; color:var(--muted); }
  .meta b { color:var(--ink); }
  .cap { padding:2px 10px 0; font-size:14px; overflow-wrap:anywhere; }
  .row { display:flex; gap:6px; padding:10px; margin-top:auto; flex-wrap:wrap; }
  button, input { font:inherit; }
  button { border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:12px; padding:6px 12px; cursor:pointer; min-height:36px; }
  button.main { background:var(--brand); border-color:var(--brand); color:#fff; font-weight:700; }
  input { flex:1; min-width:0; border:1px solid var(--line); border-radius:12px; padding:8px 12px; background:#fff; }
  .box { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:14px 16px; }
  .err { color:#b42318; font-size:13px; min-height:1.2em; }
  .empty { color:var(--muted); font-size:13px; }
  .hidden { display:none; }
  .viewer { position:fixed; inset:0; background:rgba(20,12,9,.92); display:flex; align-items:center; justify-content:center; padding:16px; z-index:9; }
  .viewer.hidden { display:none; } /* .viewer comes after .hidden, so it needs its own rule */
  .viewer img { max-width:100%; max-height:100%; border-radius:12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>لقطات الزوار</h1>
  <p class="sub">الصور اللي أرسلها الزوار من زر «شارك لقطتك». ما تطلع في الموقع إلا بعد ما توافق عليها.</p>
  <div id="login" class="box hidden">
    <div>اكتب رمز صاحب الموقع (نفس رمز صفحة التعليم):</div>
    <div class="row" style="padding:10px 0 0"><input id="key" type="password" autocomplete="off" aria-label="رمز صاحب الموقع" /><button class="main" id="go">دخول</button></div>
    <div class="err" id="err"></div>
  </div>
  <div id="data" class="hidden">
    <div class="row" style="padding:0"><button id="reload">تحديث</button><button id="logout">خروج</button></div>
    <h2 id="pendingTitle">تنتظر موافقتك</h2>
    <div class="grid" id="pending"></div>
    <h2 id="shownTitle">معروضة في الموقع</h2>
    <div class="grid" id="shown"></div>
  </div>
</div>
<div class="viewer hidden" id="viewer"><img id="big" alt="" /></div>
<script>
(function () {
  var K = "dahiah:ownerKey";
  function $(id) { return document.getElementById(id); }
  function key() { try { return localStorage.getItem(K) || ""; } catch (e) { return ""; } }
  function setKey(v) { try { v ? localStorage.setItem(K, v) : localStorage.removeItem(K); } catch (e) {} }
  function when(iso) { try { return new Date(iso).toLocaleString("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }); } catch (e) { return iso; } }
  function img(id, size, el) {
    fetch("/api/shots/" + id + "/" + size, { headers: { "x-stats-key": key() } }).then(function (r) { return r.blob(); }).then(function (b) { el.src = URL.createObjectURL(b); });
  }
  function act(id, action, card) {
    if (action === "delete" && !confirm("تحذف الصورة نهائياً؟")) return;
    fetch("/api/owner/shots/" + id, { method: "POST", headers: { "content-type": "application/json", "x-stats-key": key() }, body: JSON.stringify({ action: action }) })
      .then(function () { load(key()); });
  }
  function card(m) {
    var c = document.createElement("div"); c.className = "card";
    var i = document.createElement("img"); i.alt = m.caption || "لقطة زائر"; img(m.id, "thumb", i);
    i.onclick = function () { $("big").removeAttribute("src"); img(m.id, "full", $("big")); $("viewer").classList.remove("hidden"); };
    var meta = document.createElement("div"); meta.className = "meta";
    var b = document.createElement("b"); b.textContent = m.name || "بدون اسم"; meta.appendChild(b); meta.appendChild(document.createTextNode(" · " + when(m.at)));
    var cap = document.createElement("div"); cap.className = "cap"; cap.textContent = m.caption || "";
    var row = document.createElement("div"); row.className = "row";
    function btn(label, action, main) { var x = document.createElement("button"); x.textContent = label; if (main) x.className = "main"; x.onclick = function () { act(m.id, action, c); }; row.appendChild(x); }
    if (m.status === "pending") { btn("وافق واعرضها", "approve", true); btn("احذف", "delete"); }
    else { btn("أخفِها", "pending"); btn("احذف", "delete"); }
    c.appendChild(i); c.appendChild(meta); c.appendChild(cap); c.appendChild(row);
    return c;
  }
  function showLogin(msg) { $("login").classList.remove("hidden"); $("data").classList.add("hidden"); $("err").textContent = msg || ""; }
  function load(k) {
    fetch("/api/owner/shots", { headers: { "x-stats-key": k } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { setKey(""); return showLogin("الرمز غلط."); }
        setKey(k);
        $("login").classList.add("hidden"); $("data").classList.remove("hidden");
        var p = res.j.items.filter(function (m) { return m.status === "pending"; }), s = res.j.items.filter(function (m) { return m.status === "approved"; });
        $("pendingTitle").textContent = "تنتظر موافقتك (" + p.length + ")"; $("shownTitle").textContent = "معروضة في الموقع (" + s.length + ")";
        $("pending").innerHTML = p.length ? "" : '<div class="empty">ما فيه صور جديدة.</div>';
        $("shown").innerHTML = s.length ? "" : '<div class="empty">ما فيه صور معروضة للحين.</div>';
        p.forEach(function (m) { $("pending").appendChild(card(m)); });
        s.forEach(function (m) { $("shown").appendChild(card(m)); });
      })
      .catch(function () { showLogin("ما قدرت أجيب الصور، جرّب مرة ثانية."); });
  }
  $("viewer").onclick = function () { $("viewer").classList.add("hidden"); };
  $("go").onclick = function () { var v = $("key").value.trim(); if (v) load(v); };
  $("key").onkeydown = function (e) { if (e.key === "Enter") $("go").onclick(); };
  $("reload").onclick = function () { load(key()); };
  $("logout").onclick = function () { setKey(""); showLogin(""); };
  if (key()) load(key()); else showLogin("");
})();
</script>
</body>
</html>`;
