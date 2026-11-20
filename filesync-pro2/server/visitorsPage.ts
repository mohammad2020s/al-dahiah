// Owner page at /visitors: who visits the site (data from /api/owner/visits, needs the owner code).
export const VISITORS_PAGE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>زوار الداهية</title>
<link rel="icon" href="/images/logo.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root { --brand:#a5492a; --ink:#3f2a22; --ink2:#5d4437; --muted:#6f5446; --line:#e2d5c6; --grid:#eadfce; --bg:#f1e7da; --card:#fffdf9; --soft:#fbf6ee; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 "IBM Plex Sans Arabic", system-ui, "Segoe UI", Tahoma, sans-serif; }
  .wrap { max-width:1040px; margin:0 auto; padding:20px 16px 48px; }
  header { display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:10px; margin-bottom:16px; }
  h1 { font-size:24px; margin:0; }
  .sub { color:var(--muted); font-size:13px; margin:2px 0 0; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:16px; margin-bottom:14px; }
  .card h2 { font-size:16px; margin:0 0 2px; }
  .hint { color:var(--muted); font-size:13px; margin:0 0 10px; }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:14px; }
  .kpi { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:12px 14px; }
  .kpi b { display:block; font-size:30px; line-height:1.2; font-variant-numeric:tabular-nums; color:var(--ink); }
  .kpi span { color:var(--muted); font-size:13px; }
  .dot { display:inline-block; width:12px; height:12px; border-radius:50%; background:#2f9e5b; margin-inline-end:8px; vertical-align:middle; animation:blink 1.6s infinite; }
  @keyframes blink { 50% { opacity:.3; } }
  .kpi small { display:block; color:var(--muted); font-size:12px; margin-top:2px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media (max-width:760px) { .grid2 { grid-template-columns:1fr; } }
  .chart { position:relative; }
  .chart svg { display:block; width:100%; height:auto; overflow:visible; }
  .tip { position:absolute; pointer-events:none; background:var(--ink); color:#fbf6ee; font-size:13px; line-height:1.5; padding:6px 10px; border-radius:10px; white-space:nowrap; opacity:0; transition:opacity .1s; z-index:5; }
  ol { margin:0; padding:0; list-style:none; }
  li { display:flex; align-items:center; gap:10px; padding:6px 0; border-top:1px solid #f1e7dc; }
  li:first-child { border-top:0; }
  li .q { flex:0 0 38%; min-width:0; overflow-wrap:anywhere; font-size:14px; }
  li .barwrap { flex:1; height:8px; background:#f3ebe0; border-radius:4px; }
  li .bar { height:8px; border-radius:4px; background:var(--brand); }
  li .n { min-width:3em; text-align:left; font-weight:700; font-variant-numeric:tabular-nums; color:var(--ink); }
  .empty { color:var(--muted); font-size:13px; padding:6px 0; }
  details { margin-top:10px; }
  summary { cursor:pointer; color:var(--brand); font-size:13px; font-weight:600; }
  table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; font-variant-numeric:tabular-nums; }
  th, td { padding:6px 8px; border-top:1px solid var(--line); text-align:right; }
  th { color:var(--muted); font-weight:600; }
  td.num, th.num { text-align:left; }
  .row { display:flex; gap:8px; flex-wrap:wrap; }
  button, input { font:inherit; }
  button { border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:12px; padding:6px 12px; cursor:pointer; min-height:36px; }
  button.main { background:var(--brand); border-color:var(--brand); color:#fff; font-weight:700; }
  input { flex:1; min-width:0; border:1px solid var(--line); border-radius:12px; padding:8px 12px; background:#fff; }
  .err { color:#b42318; font-size:13px; min-height:1.2em; }
  .hidden { display:none; }
  .note { font-size:12px; color:var(--muted); margin-top:16px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>زوار الداهية</h1>
      <p class="sub" id="updated">إحصائيات زيارات الموقع</p>
    </div>
    <div class="row hidden" id="actions"><button id="reload">تحديث</button><button id="logout">خروج</button></div>
  </header>

  <div id="login" class="card hidden">
    <div>اكتب رمز صاحب الموقع (نفس رمز صفحة التعليم):</div>
    <div class="row" style="margin-top:10px"><input id="key" type="password" autocomplete="off" aria-label="رمز صاحب الموقع" /><button class="main" id="go">دخول</button></div>
    <div class="err" id="err"></div>
  </div>

  <div id="data" class="hidden">
    <div class="kpis" id="kpis"></div>

    <div class="card">
      <h2>الزوار كل يوم</h2>
      <p class="hint">آخر ٣٠ يوم. مرّر على العمود تشوف التفاصيل.</p>
      <div class="chart" id="daysChart"></div>
      <details><summary>عرض الأرقام كجدول</summary><table id="daysTable"></table></details>
    </div>

    <div class="card">
      <h2>أوقات الذروة</h2>
      <p class="hint">كم مرة انفتح الموقع في كل ساعة من اليوم (بتوقيت الرياض)، من البداية لين الحين.</p>
      <div class="chart" id="hoursChart"></div>
    </div>

    <div class="grid2">
      <div class="card"><h2>من وين جوا</h2><p class="hint">الموقع أو التطبيق اللي جابهم. واتساب ما يعرّف بنفسه، فينحسب مع «مباشر».</p><ol id="sources"></ol></div>
      <div class="card"><h2>المدن</h2><p class="hint">تقريبية: تنعرف من شبكة الإنترنت، فأغلب شبكات الجوال في نجد تطلع «الرياض» حتى لو الزائر في القصب.</p><ol id="cities"></ol></div>
      <div class="card"><h2>الأجهزة</h2><ol id="devices"></ol></div>
      <div class="card"><h2>أنظمة التشغيل</h2><ol id="os"></ol></div>
      <div class="card"><h2>الدول</h2><ol id="countries"></ol></div>
      <div class="card"><h2>لغة الجهاز</h2><ol id="langs"></ol></div>
    </div>

    <p class="note" id="note"></p>
  </div>
</div>
<script>
(function () {
  var K = "dahiah:ownerKey";
  var NS = "http://www.w3.org/2000/svg";
  function $(id) { return document.getElementById(id); }
  function key() { try { return localStorage.getItem(K) || ""; } catch (e) { return ""; } }
  function setKey(v) { try { v ? localStorage.setItem(K, v) : localStorage.removeItem(K); } catch (e) {} }
  var nf = new Intl.NumberFormat("ar-SA");
  function n(x) { return nf.format(x || 0); }
  function dayLabel(d, long) { return new Date(d + "T12:00:00Z").toLocaleDateString("ar-SA-u-ca-gregory", long ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" }); }
  function hourLabel(h) { var t = h % 12 === 0 ? 12 : h % 12; return n(t) + (h < 12 ? " ص" : " م"); }
  // Cloudflare gives city names in English: the common ones in Arabic
  var CITIES = [[/riyadh/i,"الرياض"],[/buraydah|buraidah/i,"بريدة"],[/unaizah|unayzah/i,"عنيزة"],[/bad[aā].?i/i,"البدائع"],[/jeddah|jiddah/i,"جدة"],[/mecca|makkah/i,"مكة"],[/medina|madinah/i,"المدينة المنورة"],[/dammam/i,"الدمام"],[/khobar/i,"الخبر"],[/dhahran/i,"الظهران"],[/hofuf|ahsa/i,"الأحساء"],[/shaqra/i,"شقراء"],[/qasab/i,"القصب"],[/dawadmi/i,"الدوادمي"],[/majma/i,"المجمعة"],[/zulfi/i,"الزلفي"],[/kharj/i,"الخرج"],[/hail|ha.il/i,"حائل"],[/tabuk/i,"تبوك"],[/abha/i,"أبها"],[/taif/i,"الطائف"],[/kuwait/i,"الكويت"],[/dubai/i,"دبي"],[/doha/i,"الدوحة"],[/manama/i,"المنامة"]];
  function cityAr(c) { for (var i = 0; i < CITIES.length; i++) if (CITIES[i][0].test(c)) return CITIES[i][1]; return c; }
  var regions; try { regions = new Intl.DisplayNames(["ar"], { type: "region" }); } catch (e) {}

  function kpi(label, value, small) { return '<div class="kpi"><b>' + n(value) + '</b><span>' + label + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div>'; }

  // Vertical bars, one series, one hue: rounded data end, 2px gap, recessive grid, hover tooltip
  function bars(el, items, opts) {
    el.innerHTML = "";
    // Drawn at the box's real width, so labels stay readable on a phone
    var W = Math.max(280, Math.round(el.clientWidth || 1000)), H = W < 600 ? Math.round((opts.h || 260) * 0.75) : (opts.h || 260), padL = 30, padR = 38, padT = 12, padB = 28;
    var max = Math.max(1, Math.max.apply(null, items.map(function (i) { return i.v; })));
    var step = niceStep(max), top = Math.ceil(max / step) * step;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", opts.label);
    var plotW = W - padL - padR, plotH = H - padT - padB;
    for (var g = 0; g <= top; g += step) {
      var y = padT + plotH - (g / top) * plotH;
      var ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", padL); ln.setAttribute("x2", W - padR); ln.setAttribute("y1", y); ln.setAttribute("y2", y);
      ln.setAttribute("stroke", g === 0 ? "#cdb9a5" : "#eadfce"); ln.setAttribute("stroke-width", "1");
      svg.appendChild(ln);
      var tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", W - padR + 8); tx.setAttribute("y", y + 4); tx.setAttribute("font-size", "13"); tx.setAttribute("fill", "#6f5446");
      tx.textContent = n(g); svg.appendChild(tx);
    }
    var slot = plotW / items.length, bw = Math.max(2, slot - 2);
    // Right to left, like the page: the first item (oldest day / midnight) on the right
    items.forEach(function (it, i) {
      var x = W - padR - (i + 1) * slot + 1;
      var h = (it.v / top) * plotH, y0 = padT + plotH;
      if (it.v > 0) {
        var r = Math.min(4, bw / 2, h);
        var p = document.createElementNS(NS, "path");
        p.setAttribute("d", "M" + x + " " + y0 + "V" + (y0 - h + r) + "q0 -" + r + " " + r + " -" + r + "H" + (x + bw - r) + "q" + r + " 0 " + r + " " + r + "V" + y0 + "Z");
        p.setAttribute("fill", it.hl ? "#a5492a" : "#c97a5d");
        svg.appendChild(p);
      }
      if (it.tick) {
        var t = document.createElementNS(NS, "text");
        t.setAttribute("x", x + bw / 2); t.setAttribute("y", H - 8); t.setAttribute("text-anchor", "middle"); t.setAttribute("font-size", "12"); t.setAttribute("fill", "#6f5446");
        t.textContent = it.tick; svg.appendChild(t);
      }
      var hit = document.createElementNS(NS, "rect");
      hit.setAttribute("x", x - 1); hit.setAttribute("y", padT); hit.setAttribute("width", slot); hit.setAttribute("height", plotH);
      hit.setAttribute("fill", "transparent");
      hit.addEventListener("mouseenter", function () { show(el, it.tip, x + bw / 2, y0 - h, W); });
      hit.addEventListener("click", function () { show(el, it.tip, x + bw / 2, y0 - h, W); });
      hit.addEventListener("mouseleave", function () { hide(el); });
      svg.appendChild(hit);
    });
    el.appendChild(svg);
    var tip = document.createElement("div"); tip.className = "tip"; el.appendChild(tip);
  }
  function niceStep(max) { var raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
  function show(el, html, x, y, W) {
    var tip = el.querySelector(".tip"), s = el.querySelector("svg").getBoundingClientRect().width / W;
    tip.innerHTML = html;
    var left = Math.max(0, Math.min(x * s - tip.offsetWidth / 2, el.clientWidth - tip.offsetWidth));
    tip.style.left = left + "px"; tip.style.top = Math.max(0, y * s - 8) + "px";
    tip.style.transform = "translateY(-100%)"; tip.style.opacity = 1;
  }
  function hide(el) { var t = el.querySelector(".tip"); if (t) t.style.opacity = 0; }

  function list(el, rows, fmt) {
    el.innerHTML = "";
    if (!rows || !rows.length) { el.innerHTML = '<li class="empty">ما فيه بيانات للحين.</li>'; return; }
    var max = rows[0].count || 1;
    rows.forEach(function (r) {
      var li = document.createElement("li");
      var q = document.createElement("span"); q.className = "q"; q.textContent = fmt ? fmt(r.label) : r.label;
      var bw = document.createElement("span"); bw.className = "barwrap";
      var b = document.createElement("div"); b.className = "bar"; b.style.width = Math.max(3, Math.round(100 * r.count / max)) + "%"; bw.appendChild(b);
      var c = document.createElement("span"); c.className = "n"; c.textContent = n(r.count);
      li.appendChild(q); li.appendChild(bw); li.appendChild(c); el.appendChild(li);
    });
  }

  var last = null;
  function render(d) {
    last = d;
    var narrow = $("daysChart").clientWidth < 600;
    var days = d.days, today = days[days.length - 1], yest = days[days.length - 2];
    var last7 = days.slice(-7).reduce(function (a, x) { return a + x.people; }, 0);
    var live = d.live || { people: 0, calls: 0 };
    $("kpis").innerHTML =
      '<div class="kpi" style="border-color:#a5492a;background:#fbf1ea"><b style="color:#a5492a"><span class="dot"></span>' + (live.people ? n(live.people) + (live.people === 1 ? ' شخص' : ' أشخاص') : '<span style="font-size:22px">ما فيه أحد الحين</span>') + '</b><span>الحين في الموقع</span><small>' + (live.calls ? n(live.calls) + " منهم في مكالمة مع الداهية" : "ما فيه مكالمة شغالة") + '</small></div>' +
      kpi("زوار اليوم", today.people, n(today.views) + " مرة انفتح الموقع") +
      kpi("زوار أمس", yest.people) +
      kpi("آخر ٧ أيام", last7, "زوار (مجموع الأيام)") +
      kpi("كل الزوار من البداية", d.totals.people, n(d.totals.views) + " مرة انفتح الموقع") +
      kpi("مكالمات اليوم", today.calls) +
      kpi("أسئلة اليوم", today.chats, "في المحادثة المكتوبة");
    bars($("daysChart"), days.map(function (x, i) {
      return { v: x.people, hl: i === days.length - 1, tick: (i === days.length - 1 || (narrow ? (days.length - 1 - i) % 7 === 0 : (days.length - 1 - i) % 5 === 0)) ? dayLabel(x.day) : "",
        tip: "<b>" + dayLabel(x.day, true) + "</b><br>" + n(x.people) + " زائر · " + n(x.views) + " زيارة<br>" + n(x.fresh) + " أول مرة · " + n(x.calls) + " مكالمة · " + n(x.chats) + " سؤال" };
    }), { label: "عدد الزوار في كل يوم من آخر ٣٠ يوم", h: 260 });
    var rows = '<tr><th>اليوم</th><th class="num">زوار</th><th class="num">زيارات</th><th class="num">أول مرة</th><th class="num">مكالمات</th><th class="num">أسئلة</th></tr>';
    days.slice().reverse().forEach(function (x) { rows += "<tr><td>" + dayLabel(x.day, true) + '</td><td class="num">' + n(x.people) + '</td><td class="num">' + n(x.views) + '</td><td class="num">' + n(x.fresh) + '</td><td class="num">' + n(x.calls) + '</td><td class="num">' + n(x.chats) + "</td></tr>"; });
    $("daysTable").innerHTML = rows;
    var maxH = Math.max.apply(null, d.hours);
    bars($("hoursChart"), d.hours.map(function (v, h) {
      return { v: v, hl: v === maxH && v > 0, tick: h % (narrow ? 6 : 3) === 0 ? hourLabel(h) : "", tip: "<b>الساعة " + hourLabel(h) + "</b><br>" + n(v) + " زيارة" };
    }), { label: "عدد الزيارات في كل ساعة من اليوم", h: 220 });
    list($("sources"), d.sources);
    list($("cities"), d.cities, cityAr);
    list($("devices"), d.devices);
    list($("os"), d.os);
    list($("countries"), d.countries, function (c) { try { return (regions && regions.of(c)) || c; } catch (e) { return c; } });
    list($("langs"), d.langs);
    $("updated").textContent = "آخر تحديث: " + new Date().toLocaleTimeString("ar-SA-u-ca-gregory", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Riyadh" }) + " · يتحدث كل ٢٠ ثانية";
    $("note").textContent = "العدّ بدأ " + (d.firstDay ? dayLabel(d.firstDay, true) : "اليوم") + ". «زائر» = جهاز واحد في اليوم، و«زيارة» = كل مرة ينفتح فيها الموقع، و«الحين في الموقع» = الأجهزة اللي فاتحة الموقع على الشاشة في آخر دقيقتين ونص. زياراتك أنت (الجهاز اللي فيه رمزك) ما تنحسب. ما ينحفظ أي اسم أو رقم IP.";
  }

  function showLogin(msg) { $("login").classList.remove("hidden"); $("data").classList.add("hidden"); $("actions").classList.add("hidden"); $("err").textContent = msg || ""; }
  function load(k) {
    fetch("/api/owner/visits", { headers: { "x-stats-key": k } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { setKey(""); return showLogin("الرمز غلط."); }
        setKey(k);
        $("login").classList.add("hidden"); $("data").classList.remove("hidden"); $("actions").classList.remove("hidden");
        render(res.j);
      })
      .catch(function () { if (!$("data").classList.contains("hidden")) return; showLogin("ما قدرت أجيب الأرقام، جرّب مرة ثانية."); });
  }
  $("go").onclick = function () { var v = $("key").value.trim(); if (v) load(v); };
  $("key").onkeydown = function (e) { if (e.key === "Enter") $("go").onclick(); };
  $("reload").onclick = function () { load(key()); };
  $("logout").onclick = function () { setKey(""); showLogin(""); };
  if (key()) load(key()); else showLogin("");
  setInterval(function () { if (key() && !document.hidden) load(key()); }, 20000);
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (last) render(last); }, 200); });
})();
</script>
</body>
</html>`;
