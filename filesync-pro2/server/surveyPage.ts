// Owner page at /survey: what visitors said about the season.
export const SURVEY_PAGE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>رأي الزوار - الداهية</title>
<link rel="icon" href="/images/logo.png" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root { --brand:#a5492a; --ink:#3f2a22; --muted:#6f5446; --line:#e2d5c6; --bg:#f1e7da; --card:#fffdf9; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 "IBM Plex Sans Arabic", system-ui, "Segoe UI", Tahoma, sans-serif; }
  .wrap { max-width:960px; margin:0 auto; padding:20px 16px 48px; }
  h1 { font-size:24px; margin:0; }
  .sub { color:var(--muted); font-size:13px; margin:2px 0 14px; }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:14px; }
  .kpi, .card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:12px 14px; }
  .card { border-radius:20px; padding:16px; margin-bottom:14px; }
  .kpi b { display:block; font-size:30px; line-height:1.2; font-variant-numeric:tabular-nums; }
  .kpi span { color:var(--muted); font-size:13px; }
  .card h2 { font-size:16px; margin:0 0 10px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media (max-width:760px) { .grid2 { grid-template-columns:1fr; } }
  ol { margin:0; padding:0; list-style:none; }
  li { display:flex; align-items:center; gap:10px; padding:6px 0; border-top:1px solid #f1e7dc; }
  li:first-child { border-top:0; }
  .q { flex:0 0 42%; min-width:0; font-size:14px; overflow-wrap:anywhere; }
  .barwrap { flex:1; height:8px; background:#f3ebe0; border-radius:4px; }
  .bar { height:8px; border-radius:4px; background:var(--brand); }
  .n { min-width:3.5em; text-align:left; font-weight:700; font-variant-numeric:tabular-nums; }
  .note { padding:10px 0; border-top:1px solid #f1e7dc; }
  .note:first-child { border-top:0; }
  .note small { color:var(--muted); }
  .row { display:flex; gap:8px; flex-wrap:wrap; }
  button, input { font:inherit; }
  button { border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:12px; padding:6px 12px; cursor:pointer; min-height:36px; }
  button.main { background:var(--brand); border-color:var(--brand); color:#fff; font-weight:700; }
  input { flex:1; min-width:0; border:1px solid var(--line); border-radius:12px; padding:8px 12px; background:#fff; }
  .err { color:#b42318; font-size:13px; min-height:1.2em; }
  .empty { color:var(--muted); font-size:13px; }
  .hidden { display:none; }
</style>
</head>
<body>
<div class="wrap">
  <h1>رأي الزوار في الموسم</h1>
  <p class="sub">من استبيان «شاركنا رأيك» في الموقع.</p>
  <div id="login" class="card hidden">
    <div>اكتب رمز صاحب الموقع (نفس رمز صفحة التعليم):</div>
    <div class="row" style="margin-top:10px"><input id="key" type="password" autocomplete="off" aria-label="رمز صاحب الموقع" /><button class="main" id="go">دخول</button></div>
    <div class="err" id="err"></div>
  </div>
  <div id="data" class="hidden">
    <div class="row" style="margin-bottom:12px"><button id="reload">تحديث</button><button id="logout">خروج</button></div>
    <div class="kpis" id="kpis"></div>
    <div class="card"><h2>التقييم بالنجوم</h2><ol id="stars"></ol></div>
    <div class="grid2">
      <div class="card"><h2>وش أكثر شي عجبهم</h2><ol id="liked"></ol></div>
      <div class="card"><h2>وش يحتاج تحسين</h2><ol id="improve"></ol></div>
      <div class="card"><h2>ينصحون غيرهم يزورون الموسم؟</h2><ol id="recommend"></ol></div>
      <div class="card"><h2>هل ساعدهم الداهية؟</h2><ol id="dahiah"></ol></div>
      <div class="card"><h2>من وين جوا</h2><ol id="from"></ol></div>
    </div>
    <div class="card"><h2 id="notesTitle">ملاحظاتهم</h2><div id="notes"></div></div>
  </div>
</div>
<script>
(function () {
  var K = "dahiah:ownerKey";
  function $(id) { return document.getElementById(id); }
  function key() { try { return localStorage.getItem(K) || ""; } catch (e) { return ""; } }
  function setKey(v) { try { v ? localStorage.setItem(K, v) : localStorage.removeItem(K); } catch (e) {} }
  var nf = new Intl.NumberFormat("ar-SA");
  function n(x) { return nf.format(x || 0); }
  function list(el, rows, total) {
    el.innerHTML = "";
    var max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.count; })));
    rows.forEach(function (r) {
      var li = document.createElement("li");
      var q = document.createElement("span"); q.className = "q"; q.textContent = r.label;
      var w = document.createElement("span"); w.className = "barwrap";
      var b = document.createElement("div"); b.className = "bar"; b.style.width = (r.count ? Math.max(3, Math.round(100 * r.count / max)) : 0) + "%"; w.appendChild(b);
      var c = document.createElement("span"); c.className = "n"; c.textContent = n(r.count) + (total ? " (" + n(Math.round(100 * r.count / total)) + "٪)" : "");
      li.appendChild(q); li.appendChild(w); li.appendChild(c); el.appendChild(li);
    });
  }
  function render(d) {
    var rec = (d.recommend || []).find(function (r) { return r.label === "أكيد"; });
    $("kpis").innerHTML =
      '<div class="kpi"><b>' + n(d.count) + '</b><span>شخص جاوب الاستبيان</span></div>' +
      '<div class="kpi"><b>' + (d.count ? nf.format(Math.round(d.average * 10) / 10) + ' / ٥' : '—') + '</b><span>متوسط التقييم</span></div>' +
      '<div class="kpi"><b>' + (d.count ? n(Math.round(100 * (rec ? rec.count : 0) / d.count)) + '٪' : '—') + '</b><span>ينصحون غيرهم يزورون</span></div>';
    if (!d.count) { ["stars","liked","improve","recommend","dahiah","from"].forEach(function (id) { $(id).innerHTML = '<li class="empty">ما فيه إجابات للحين.</li>'; }); $("notes").innerHTML = '<div class="empty">ما فيه ملاحظات للحين.</div>'; return; }
    list($("stars"), [5,4,3,2,1].map(function (s) { return { label: "★".repeat(s), count: d.stars[s - 1] }; }), d.count);
    list($("liked"), d.liked, d.count); list($("improve"), d.improve, d.count);
    list($("recommend"), d.recommend, d.count); list($("dahiah"), d.dahiah, d.count); list($("from"), d.from, d.count);
    $("notesTitle").textContent = "ملاحظاتهم (" + n(d.notes.length) + ")";
    $("notes").innerHTML = d.notes.length ? "" : '<div class="empty">ما فيه ملاحظات للحين.</div>';
    d.notes.forEach(function (x) {
      var div = document.createElement("div"); div.className = "note";
      var t = document.createElement("div"); t.textContent = x.note;
      var s = document.createElement("small"); s.textContent = "★".repeat(x.rating) + " · " + new Date(x.at).toLocaleString("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" });
      div.appendChild(t); div.appendChild(s); $("notes").appendChild(div);
    });
  }
  function showLogin(msg) { $("login").classList.remove("hidden"); $("data").classList.add("hidden"); $("err").textContent = msg || ""; }
  function load(k) {
    fetch("/api/owner/survey", { headers: { "x-stats-key": k } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { setKey(""); return showLogin("الرمز غلط."); }
        setKey(k); $("login").classList.add("hidden"); $("data").classList.remove("hidden"); render(res.j);
      })
      .catch(function () { showLogin("ما قدرت أجيب النتائج، جرّب مرة ثانية."); });
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
