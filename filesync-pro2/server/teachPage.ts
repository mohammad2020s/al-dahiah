// Owner page at /teach: teach «الداهية» how to say words (used in the chat's read-aloud and the call)
// and add standing rules. Data goes through /api/owner/pron and /api/owner/rule (needs STATS_KEY).
export const TEACH_PAGE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>تعليم النطق - الداهية</title>
<link rel="icon" href="/images/logo.png" />
<style>
  :root { --brown:#94532d; --dark:#4a2614; --gold:#b8893d; --ink:#2b1a10; --muted:#7a5a45; --line:#e8d6bd; --bg:#f7efe2; --card:#fffaf2; --ok:#0f766e; --bad:#b42318; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.7 system-ui, "Segoe UI", Tahoma, sans-serif; }
  .wrap { max-width:760px; margin:0 auto; padding:20px 16px 56px; }
  header { background:var(--dark); color:#fbf3e4; border-radius:20px; padding:18px 20px; border:3px solid var(--gold); margin-bottom:16px; }
  header h1 { margin:0; font-size:24px; }
  header p { margin:4px 0 0; color:#e8d3b4; font-size:14px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px; margin-bottom:14px; }
  .card h2 { margin:0 0 6px; font-size:18px; }
  .hint { margin:0 0 12px; color:var(--muted); font-size:14px; }
  label { display:block; font-weight:700; font-size:14px; margin:8px 0 4px; }
  input, textarea { width:100%; font:inherit; font-size:20px; padding:10px 12px; border:2px solid var(--line); border-radius:12px; background:#fff; color:var(--ink); }
  input:focus, textarea:focus { outline:none; border-color:var(--brown); }
  textarea { font-size:16px; min-height:80px; resize:vertical; }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  @media (max-width:560px) { .row { grid-template-columns:1fr; } }
  .marks { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .marks button { min-width:44px; min-height:44px; font-size:22px; border:1px solid var(--line); background:#fff; border-radius:10px; cursor:pointer; color:var(--ink); }
  .marks button small { display:block; font-size:10px; color:var(--muted); line-height:1; }
  .btn { min-height:46px; padding:0 18px; border:0; border-radius:12px; font:inherit; font-weight:700; cursor:pointer; background:var(--brown); color:#fff; }
  .btn.ghost { background:#fff; color:var(--brown); border:2px solid var(--brown); }
  .btn:disabled { opacity:.5; cursor:default; }
  .actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
  ul { list-style:none; margin:0; padding:0; }
  li { display:flex; align-items:center; gap:10px; padding:10px 0; border-top:1px solid var(--line); flex-wrap:wrap; }
  li:first-child { border-top:0; }
  .w { font-size:20px; font-weight:700; min-width:90px; }
  .arrow { color:var(--muted); }
  .s { font-size:22px; color:var(--brown); font-weight:700; flex:1; }
  li .btn { min-height:40px; padding:0 12px; font-size:14px; }
  .msg { margin-top:10px; font-weight:700; min-height:1.5em; }
  .msg.ok { color:var(--ok); } .msg.bad { color:var(--bad); }
  .empty { color:var(--muted); font-size:14px; }
  #login { display:none; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>تعليم النطق للداهية</h1>
    <p>اللي تعلّمه هنا يمشي على صوت الاستماع في الدردشة وعلى المكالمة، ويبقى محفوظ.</p>
  </header>

  <section class="card" id="login">
    <h2>مفتاحك</h2>
    <p class="hint">اكتب مفتاح المالك (STATS_KEY) مرة وحدة، ويبقى محفوظ في هذا الجهاز بس.</p>
    <input id="key" type="password" autocomplete="off" dir="ltr" />
    <div class="actions"><button class="btn" id="saveKey">دخول</button></div>
    <div class="msg" id="loginMsg"></div>
  </section>

  <div id="app" hidden>
    <section class="card">
      <h2>علّمه كلمة</h2>
      <p class="hint">اكتب الكلمة مثل ما تنكتب عادي، وتحتها كيف تبيه ينطقها بالحركات بالضبط. مثال: «القصب» تنقال «القْصَب».</p>
      <div class="row">
        <div><label for="word">الكلمة</label><input id="word" placeholder="القصب" /></div>
        <div><label for="say">كيف تنقال</label><input id="say" placeholder="القْصَب" /></div>
      </div>
      <div class="marks" aria-label="الحركات">
        <button type="button" data-m="َ">ـَ<small>فتحة</small></button>
        <button type="button" data-m="ِ">ـِ<small>كسرة</small></button>
        <button type="button" data-m="ُ">ـُ<small>ضمة</small></button>
        <button type="button" data-m="ْ">ـْ<small>سكون</small></button>
        <button type="button" data-m="ّ">ـّ<small>شدة</small></button>
        <button type="button" data-m="ً">ـً<small>تنوين</small></button>
        <button type="button" data-m="گ">گ<small>قاف نجدية</small></button>
      </div>
      <div class="actions">
        <button class="btn" id="teach">احفظ النطق</button>
        <button class="btn ghost" id="hear">اسمع كيف ينطقها</button>
      </div>
      <div class="msg" id="teachMsg"></div>
    </section>

    <section class="card">
      <h2>الكلمات اللي علّمته إياها</h2>
      <ul id="words"></ul>
    </section>

    <section class="card">
      <h2>قاعدة عامة</h2>
      <p class="hint">أي تعليمات يمشي عليها في الكلام كله. مثال: «لا تقول أبداً كلمة (طيب)، قل (زين)».</p>
      <textarea id="rule"></textarea>
      <div class="actions"><button class="btn" id="addRule">أضف القاعدة</button></div>
      <div class="msg" id="ruleMsg"></div>
      <ul id="rules" style="margin-top:10px"></ul>
    </section>

    <div class="actions"><button class="btn ghost" id="logout">تسجيل خروج من هذا الجهاز</button></div>
  </div>
</div>
<script>
(function () {
  var K = "dahiah:ownerKey";
  function key() { try { return localStorage.getItem(K) || ""; } catch (e) { return ""; } }
  function setKey(v) { try { v ? localStorage.setItem(K, v) : localStorage.removeItem(K); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function msg(id, text, ok) { var m = $(id); m.textContent = text; m.className = "msg " + (ok ? "ok" : "bad"); }
  function api(path, body) {
    return fetch("/api" + path, {
      method: body ? "POST" : "GET",
      headers: Object.assign({ "x-stats-key": key() }, body ? { "Content-Type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }
  function li(main, buttonText, onClick) {
    var el = document.createElement("li");
    el.appendChild(main);
    var b = document.createElement("button");
    b.className = "btn ghost"; b.textContent = buttonText; b.onclick = onClick;
    el.appendChild(b);
    return el;
  }
  function render(data) {
    var w = $("words"); w.innerHTML = "";
    if (!data.words.length) { w.innerHTML = '<li class="empty">ما علّمته شي للحين.</li>'; }
    data.words.slice().reverse().forEach(function (t) {
      var box = document.createElement("span"); box.style.display = "contents";
      box.innerHTML = '<span class="w"></span><span class="arrow">←</span><span class="s"></span>';
      box.querySelector(".w").textContent = t.word;
      box.querySelector(".s").textContent = t.say;
      w.appendChild(li(box, "احذف", function () {
        api("/owner/pron/forget", { word: t.word }).then(load);
      }));
    });
    var r = $("rules"); r.innerHTML = "";
    data.rules.forEach(function (rule, i) {
      var s = document.createElement("span"); s.style.flex = "1"; s.textContent = (i + 1) + ") " + rule.text;
      r.appendChild(li(s, "احذف", function () { api("/owner/rule/remove", { n: i + 1 }).then(load); }));
    });
  }
  function load() {
    return api("/owner/pron").then(function (d) {
      if (d._status !== 200) { $("app").hidden = true; $("login").style.display = "block"; if (key()) msg("loginMsg", "المفتاح غلط", false); return; }
      $("login").style.display = "none"; $("app").hidden = false; render(d);
    });
  }
  // the accent buttons drop a mark into the "how it is said" box at the cursor
  var last = $("say");
  ["word", "say"].forEach(function (id) { $(id).addEventListener("focus", function () { last = $(id); }); });
  document.querySelectorAll(".marks button").forEach(function (b) {
    b.addEventListener("click", function () {
      var el = last, m = b.getAttribute("data-m"), s = el.selectionStart || el.value.length, e = el.selectionEnd || s;
      el.value = el.value.slice(0, s) + m + el.value.slice(e);
      el.focus(); el.setSelectionRange(s + m.length, s + m.length);
    });
  });
  $("saveKey").onclick = function () { setKey($("key").value.trim()); load(); };
  $("logout").onclick = function () { setKey(""); location.reload(); };
  $("teach").onclick = function () {
    var word = $("word").value.trim(), say = $("say").value.trim();
    if (!word || !say) return msg("teachMsg", "اكتب الكلمة وكيف تنقال", false);
    api("/owner/pron", { word: word, say: say }).then(function (d) {
      if (d.ok) { msg("teachMsg", "انحفظ: «" + word + "» تنقال «" + say + "»", true); $("word").value = ""; $("say").value = ""; load(); }
      else msg("teachMsg", d.error || "ما انحفظ، جرّب مرة ثانية", false);
    });
  };
  $("addRule").onclick = function () {
    var text = $("rule").value.trim();
    if (!text) return;
    api("/owner/rule", { text: text }).then(function (d) {
      if (d.ok) { msg("ruleMsg", "انضافت القاعدة", true); $("rule").value = ""; load(); } else msg("ruleMsg", d.error || "ما انضافت", false);
    });
  };
  // Hear it: the read-aloud voice says a short sentence with the word, the way it is saved
  $("hear").onclick = function () {
    var say = $("say").value.trim() || $("word").value.trim();
    if (!say) return msg("teachMsg", "اكتب الكلمة أول", false);
    var b = $("hear"); b.disabled = true; msg("teachMsg", "لحظة…", true);
    fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json", "x-stats-key": key() }, body: JSON.stringify({ text: "حيّاك الله، " + say + "." }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        b.disabled = false;
        if (!d.audio) return msg("teachMsg", "صوت الاستماع مو متاح الحين (غالباً خلص حده اليومي)، جرّب بكرة. النطق انحفظ عادي إذا ضغطت احفظ.", false);
        var bin = atob(d.audio), pcm = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
        var rate = Number((/rate=(\\d+)/.exec(d.mimeType || "") || [])[1]) || 24000;
        var head = new DataView(new ArrayBuffer(44));
        function str(o, s) { for (var j = 0; j < s.length; j++) head.setUint8(o + j, s.charCodeAt(j)); }
        str(0, "RIFF"); head.setUint32(4, 36 + pcm.length, true); str(8, "WAVE"); str(12, "fmt ");
        head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true); head.setUint32(24, rate, true);
        head.setUint32(28, rate * 2, true); head.setUint16(32, 2, true); head.setUint16(34, 16, true); str(36, "data"); head.setUint32(40, pcm.length, true);
        new Audio(URL.createObjectURL(new Blob([head.buffer, pcm], { type: "audio/wav" }))).play();
        msg("teachMsg", "", true);
      })
      .catch(function () { b.disabled = false; msg("teachMsg", "صار خطأ، جرّب مرة ثانية", false); });
  };
  load();
})();
</script>
</body>
</html>`;
