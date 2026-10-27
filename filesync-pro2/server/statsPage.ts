// Owner page at /stats: what visitors ask «الداهية». Data comes from /api/stats (needs STATS_KEY).
export const STATS_PAGE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>أسئلة الزوار - الداهية</title>
<link rel="icon" href="/images/logo.png" />
<style>
  :root { --brand:#b82e24; --brand-dark:#992017; --ink:#321210; --muted:#7a5a57; --line:#f2d4d1; --bg:#fbf6f4; --card:#fff; --soft:#fffaf9; --ok:#0f766e; --warn:#b45309; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 system-ui, "Segoe UI", Tahoma, sans-serif; }
  .wrap { max-width:1000px; margin:0 auto; padding:20px 16px 48px; }
  header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
  h1 { font-size:22px; margin:0; }
  .sub { color:var(--muted); font-size:13px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px; margin-bottom:14px; }
  .card h2 { font-size:16px; margin:0 0 4px; }
  .card p.hint { margin:0 0 10px; color:var(--muted); font-size:13px; }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:14px; }
  .kpi { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:12px 14px; }
  .kpi b { display:block; font-size:24px; font-variant-numeric:tabular-nums; }
  .kpi span { color:var(--muted); font-size:12px; }
  .kpi.warn b { color:var(--warn); } .kpi.ok b { color:var(--ok); }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media (max-width:760px) { .grid { grid-template-columns:1fr; } }
  ol { margin:0; padding:0; list-style:none; }
  li { display:flex; align-items:center; gap:10px; padding:7px 0; border-top:1px solid #f6e6e4; }
  li:first-child { border-top:0; }
  li .q { flex:1; min-width:0; overflow-wrap:anywhere; }
  li.group { display:block; }
  li.group .row { display:flex; align-items:center; gap:10px; }
  li.group .ex { margin:4px 0 2px; padding:0; list-style:none; color:var(--muted); font-size:13px; }
  li.group .ex span { display:inline-block; background:var(--soft); border:1px solid #f6e6e4; border-radius:999px; padding:1px 9px; margin:3px 0 0 4px; }
  li .n { font-variant-numeric:tabular-nums; font-weight:700; color:var(--brand); min-width:2.5em; text-align:left; }
  .bar { height:6px; border-radius:3px; background:var(--brand); opacity:.75; }
  .barwrap { flex:0 0 90px; background:#f6e6e4; border-radius:3px; }
  .empty { color:var(--muted); font-size:13px; padding:6px 0; }
  form { display:flex; gap:8px; flex-wrap:wrap; }
  input { flex:1; min-width:200px; font:inherit; font-size:16px; padding:10px 12px; border:1px solid var(--line); border-radius:12px; background:var(--soft); color:var(--ink); }
  button { font:inherit; font-weight:700; padding:10px 16px; border:0; border-radius:12px; background:var(--brand); color:#fff; cursor:pointer; }
  button:hover { background:var(--brand-dark); }
  button.ghost { background:transparent; color:var(--brand); border:1px solid var(--line); }
  .err { color:var(--brand); font-size:13px; margin-top:8px; }
  .h3 { font-size:13px; margin:6px 0 2px; color:var(--muted); font-weight:600; }
  .note { font-size:12px; color:var(--muted); }
  .hidden { display:none; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>أسئلة زوار «الداهية»</h1>
      <div class="sub" id="sub">وش يسأل عنه الناس، والأسئلة اللي ما عنده لها جواب</div>
    </div>
    <div id="actions" class="hidden"><button class="ghost" id="refresh">تحديث</button></div>
  </header>

  <div class="card" id="login">
    <h2>مفتاح الدخول</h2>
    <p class="hint">الصفحة خاصة بصاحب الموقع. أدخل قيمة STATS_KEY المضبوطة في Render.</p>
    <form id="f"><input id="key" type="password" autocomplete="current-password" placeholder="المفتاح" aria-label="المفتاح" /><button>عرض</button></form>
    <div class="err" id="err"></div>
  </div>

  <div id="data" class="hidden">
    <div class="kpis" id="kpis"></div>
    <div class="card">
      <h2>أسئلة ما لقى لها جواب</h2>
      <p class="hint">الداهية رد عليها بالترحيب العام لأنه ما عنده معلومة. أضف إجاباتها أول.</p>
      <ol id="unanswered"></ol>
    </div>
    <div class="grid">
      <div class="card"><h2>الأسئلة الشائعة</h2><p class="hint">الأسئلة اللي معناها واحد مجمّعة تحت عنوان واحد، وتحتها كيف سألها الناس. السلام والسوالف مستبعدة.</p><ol id="top"></ol></div>
      <div>
        <div class="card"><h2>أكثر المواضيع</h2><ol id="topics"></ol></div>
        <div class="card"><h2>الأسئلة حسب اليوم</h2><ol id="days"></ol></div>
      </div>
    </div>
    <div class="card"><h2>مين جاوب الأسئلة</h2><p class="hint">النماذج المجانية أول، والمدفوع بس لما يخلص المجاني. اليوم يبدأ ١٠ الصبح بتوقيت الرياض عند Google، والأرقام هنا بيوم الرياض.</p>
      <div class="grid"><div><h3 class="h3">اليوم</h3><ol id="engToday"></ol></div><div><h3 class="h3">من البداية</h3><ol id="engAll"></ol></div></div></div>
    <div class="card"><h2>أسئلة خارج التخصص</h2><p class="hint">رفضها لأنها مو عن القصب. لو تكرر شي منها وله علاقة بالقصب، أضفه.</p><ol id="oos"></ol></div>
    <p class="note" id="storage"></p>
  </div>
</div>
<script>
(function () {
  var TOPIC = { muqhim_pan:"مملحة المقحم", salt_pans:"ممالح القصب (الجفار)", sabkha:"الصبخة", zahim_palace:"قصر الزاحم", qusaibi_building:"مبنى القصبي", obaidi_souq:"سوق العبيدي", rashid_house:"منزل الراشد", old_town:"البلدة القديمة", marqab:"المرقب", season:"موسم الملح", town:"مدينة القصب", cafes:"المقاهي", weather:"الطقس", other:"أخرى / عام" };
  var KIND = { gemini:"جاوب بالذكاء الاصطناعي", local:"جاوب من المعلومات المحفوظة", unanswered:"ما لقى جواب", out_of_scope:"خارج التخصص", family:"سؤال عن العوائل", weather:"الطقس", greeting:"سلام وترحيب" };
  var engLabel = function (k) {
    if (k === "local") return "المعلومات المحفوظة (بدون ذكاء اصطناعي)";
    var p = k.split(":"); var tier = p[0] === "paid" ? "مدفوع" : "مجاني";
    return tier + " · " + (p[1] || "");
  };
  var $ = function (id) { return document.getElementById(id); };
  var store = { get: function () { try { return sessionStorage.getItem("statsKey") || ""; } catch (e) { return ""; } },
                set: function (v) { try { sessionStorage.setItem("statsKey", v); } catch (e) {} } };
  var fmt = function (n) { return Number(n || 0).toLocaleString("ar-SA"); };

  function list(el, rows, label) {
    el.innerHTML = "";
    if (!rows || !rows.length) { el.innerHTML = '<div class="empty">ما فيه شي للحين</div>'; return; }
    var max = rows[0].count || 1;
    rows.forEach(function (r) {
      var li = document.createElement("li");
      var q = document.createElement("span"); q.className = "q"; q.textContent = label ? label(r.text) : r.text;
      var bw = document.createElement("span"); bw.className = "barwrap";
      var b = document.createElement("div"); b.className = "bar"; b.style.width = Math.max(4, Math.round(100 * r.count / max)) + "%"; bw.appendChild(b);
      var n = document.createElement("span"); n.className = "n"; n.textContent = fmt(r.count);
      li.appendChild(q); li.appendChild(bw); li.appendChild(n); el.appendChild(li);
    });
  }

  function groups(el, rows) {
    el.innerHTML = "";
    if (!rows || !rows.length) { el.innerHTML = '<div class="empty">ما فيه شي للحين</div>'; return; }
    var max = rows[0].count || 1;
    rows.forEach(function (g) {
      var li = document.createElement("li"); li.className = "group";
      var row = document.createElement("div"); row.className = "row";
      var q = document.createElement("span"); q.className = "q"; q.style.fontWeight = "600"; q.textContent = g.label;
      var bw = document.createElement("span"); bw.className = "barwrap";
      var b = document.createElement("div"); b.className = "bar"; b.style.width = Math.max(4, Math.round(100 * g.count / max)) + "%"; bw.appendChild(b);
      var n = document.createElement("span"); n.className = "n"; n.textContent = fmt(g.count);
      row.appendChild(q); row.appendChild(bw); row.appendChild(n); li.appendChild(row);
      if (g.examples && (g.examples.length > 1 || g.examples[0].text !== g.label)) {
        var ex = document.createElement("div"); ex.className = "ex";
        g.examples.forEach(function (e) { var s = document.createElement("span"); s.textContent = e.text + " (" + fmt(e.count) + ")"; ex.appendChild(s); });
        li.appendChild(ex);
      }
      el.appendChild(li);
    });
  }

  function kpi(label, value, cls) { return '<div class="kpi ' + (cls || "") + '"><b>' + fmt(value) + '</b><span>' + label + '</span></div>'; }

  function load(key) {
    $("err").textContent = "";
    fetch("/api/stats?limit=60", { headers: { "x-stats-key": key } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (!res.ok) {
          $("err").textContent = res.status === 404 ? "الإحصائيات مقفلة: لازم يتضبط STATS_KEY في Render أول." : "المفتاح غلط.";
          $("login").classList.remove("hidden"); $("data").classList.add("hidden"); $("actions").classList.add("hidden");
          return;
        }
        store.set(key);
        var d = res.j, k = d.kinds || {};
        var real = d.realQuestions != null ? d.realQuestions : d.total;
        var answered = Math.max(0, real - (k.unanswered || 0));
        $("kpis").innerHTML =
          kpi("أسئلة فعلية", real) +
          kpi("سلام وسوالف (مستبعدة)", d.chatter || 0) +
          kpi("جاوبها", answered, "ok") +
          kpi("ما لقى لها جواب", k.unanswered || 0, "warn") +
          kpi("خارج التخصص", k.out_of_scope || 0) +
          kpi("جاوبها بالذكاء الاصطناعي", k.gemini || 0);
        list($("unanswered"), d.unanswered);
        groups($("top"), d.groups || []);
        list($("topics"), d.topics, function (t) { return TOPIC[t] || t; });
        list($("days"), d.days.map(function (x) { return { text: x.day, count: x.count }; }));
        list($("oos"), d.outOfScope);
        var engRows = function (o) { return Object.keys(o || {}).map(function (k) { return { text: k, count: o[k] }; }).sort(function (a, b) { return b.count - a.count; }); };
        list($("engToday"), engRows(d.enginesToday), engLabel);
        list($("engAll"), engRows(d.engines), engLabel);
        $("storage").textContent = d.storage === "keyvalue"
          ? "الأرقام محفوظة في Render Key Value."
          : "تنبيه: الأرقام محفوظة في الذاكرة فقط، وتنمسح لما ينام السيرفر أو ينزل تحديث. اربط Render Key Value عشان تنحفظ.";
        $("login").classList.add("hidden"); $("data").classList.remove("hidden"); $("actions").classList.remove("hidden");
      })
      .catch(function () { $("err").textContent = "ما قدرت أجيب البيانات، جرّب مرة ثانية."; });
  }

  $("f").addEventListener("submit", function (e) { e.preventDefault(); var v = $("key").value.trim(); if (v) load(v); });
  $("refresh").addEventListener("click", function () { var v = store.get(); if (v) load(v); });
  var saved = store.get(); if (saved) load(saved);
})();
</script>
</body>
</html>`;
