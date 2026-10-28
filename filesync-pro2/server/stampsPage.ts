// Owner page at /stamps: printable QR signs for «جواز الملح», one per stop.
// The codes come from /api/passport/codes (needs STATS_KEY); the QR images are drawn in the
// owner's browser with qrcodejs from cdnjs, so the server needs no extra package.
export const STAMPS_PAGE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>لوحات جواز الملح - الداهية</title>
<link rel="icon" href="/images/logo.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@500;700;800&display=swap" rel="stylesheet" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
  :root { --brand:#b82e24; --dark:#7f1a12; --ink:#321210; --muted:#7a5a57; --line:#f2d4d1; --bg:#fbf6f4; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:"Alexandria", system-ui, sans-serif; }
  .bar { max-width:900px; margin:0 auto; padding:20px 16px; display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
  h1 { margin:0; font-size:22px; }
  .sub { color:var(--muted); font-size:13px; margin-top:4px; }
  form { display:flex; gap:8px; flex-wrap:wrap; }
  input { font:inherit; font-size:16px; padding:10px 12px; border:1px solid var(--line); border-radius:12px; min-width:220px; }
  button { font:inherit; font-weight:700; padding:10px 16px; border:0; border-radius:12px; background:var(--brand); color:#fff; cursor:pointer; }
  .err { color:var(--brand); font-size:13px; max-width:900px; margin:0 auto; padding:0 16px; }
  .sheet { max-width:900px; margin:0 auto; padding:0 16px 40px; display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  @media (max-width:640px) { .sheet { grid-template-columns:1fr; } }
  .sign { background:#fff; border:3px solid var(--brand); border-radius:28px; padding:22px 18px; text-align:center; break-inside:avoid; page-break-inside:avoid; }
  .sign .top { font-size:13px; font-weight:700; color:var(--brand); letter-spacing:.5px; }
  .sign h2 { margin:6px 0 2px; font-size:26px; font-weight:800; }
  .sign .en { color:var(--muted); font-size:13px; }
  .qr { display:flex; justify-content:center; margin:16px 0 12px; }
  .qr img, .qr canvas { width:220px !important; height:220px !important; }
  .sign .how { font-size:14px; font-weight:700; }
  .sign .how small { display:block; font-weight:500; color:var(--muted); margin-top:4px; }
  .sign .url { font-size:10px; color:var(--muted); margin-top:10px; direction:ltr; word-break:break-all; }
  .hidden { display:none; }
  @media print {
    @page { size:A4; margin:12mm; }
    body { background:#fff; }
    .bar, .err { display:none; }
    .sheet { grid-template-columns:1fr; gap:0; padding:0; }
    .sign { height:calc(297mm - 24mm); display:flex; flex-direction:column; justify-content:center; page-break-after:always; border-width:6px; }
    .sign h2 { font-size:54px; } .sign .top { font-size:22px; } .sign .en { font-size:20px; }
    .qr img, .qr canvas { width:110mm !important; height:110mm !important; }
    .sign .how { font-size:26px; } .sign .url { font-size:13px; }
  }
</style>
</head>
<body>
  <div class="bar">
    <div>
      <h1>لوحات «جواز الملح»</h1>
      <div class="sub">اطبع كل لوحة على ورقة A4 وحطها عند مكانها. الزائر يمسح الرمز بكاميرا جواله وياخذ الختم.</div>
    </div>
    <div id="actions" class="hidden"><button onclick="window.print()">اطبع اللوحات</button></div>
  </div>
  <div class="bar" id="login">
    <form id="f"><input id="key" type="password" placeholder="مفتاح الإحصائيات (STATS_KEY)" aria-label="المفتاح" /><button>عرض اللوحات</button></form>
  </div>
  <p class="err" id="err"></p>
  <div class="sheet" id="sheet"></div>
<script>
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function get() { try { return sessionStorage.getItem("statsKey") || ""; } catch (e) { return ""; } }
  function set(v) { try { sessionStorage.setItem("statsKey", v); } catch (e) {} }
  function load(key) {
    $("err").textContent = "";
    fetch("/api/passport/codes", { headers: { "x-stats-key": key } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { $("err").textContent = res.status === 404 ? "مقفلة: لازم يتضبط STATS_KEY في Render." : "المفتاح غلط."; return; }
        set(key);
        $("login").classList.add("hidden"); $("actions").classList.remove("hidden");
        var sheet = $("sheet"); sheet.innerHTML = "";
        res.j.stops.forEach(function (s) {
          var url = location.origin + "/?stamp=" + encodeURIComponent(s.code);
          var el = document.createElement("div"); el.className = "sign";
          el.innerHTML = '<div class="top">جواز الملح · موسم ملح القصب</div><h2></h2><div class="en"></div><div class="qr"></div>' +
            '<div class="how">امسح الرمز وخذ ختمك<small>Scan to stamp your Salt Passport</small></div><div class="url"></div>';
          el.querySelector("h2").textContent = s.ar;
          el.querySelector(".en").textContent = s.en;
          el.querySelector(".url").textContent = url;
          sheet.appendChild(el);
          if (window.QRCode) new QRCode(el.querySelector(".qr"), { text: url, width: 440, height: 440, colorDark: "#321210", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
          else el.querySelector(".qr").textContent = url;
        });
      })
      .catch(function () { $("err").textContent = "ما قدرت أجيب الرموز، جرّب مرة ثانية."; });
  }
  $("f").addEventListener("submit", function (e) { e.preventDefault(); var v = $("key").value.trim(); if (v) load(v); });
  var saved = get(); if (saved) load(saved);
})();
</script>
</body>
</html>`;
