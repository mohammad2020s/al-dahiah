import React, { useEffect, useState } from "react";
import { CalendarDays, Phone, Send } from "lucide-react";
import { prayerTimes } from "./PrayerTimes";

// «الليلة في الموسم»: today's events from the official visitor guide (dates, times and places only
// from it), the next one highlighted; plus the big «كلّم الداهية» button and «أرسله لأهلك».
// Times "after Maghrib / Isha" use the site's own prayer times for Al-Qasab.

type At = number | "asr" | "maghrib" | "isha"; // hours (16.5 = 4:30 pm) or after a prayer
type Ev = { name: string; from: At; to?: At | "sunset"; label: string; ask?: string };

const DAILY: Ev[] = [
  { name: "رحلات باص المملحة النموذجية", from: 12, to: 17, label: "١٢ الظهر – ٥ العصر" },
  { name: "الكتاتيب", from: 16, to: 18, label: "٤ – ٦ العصر" },
  { name: "الخيول العربية ومنطقة الرسم", from: 16, to: 20, label: "٤ – ٨ المساء" },
];
const ARDAH: Ev[] = [
  { name: "العرضة السعودية", from: "maghrib", label: "بعد صلاة المغرب", ask: "وين العرضة السعودية ومتى؟" },
  { name: "العرضة السعودية", from: "isha", label: "بعد صلاة العشاء", ask: "وين العرضة السعودية ومتى؟" },
  { name: "السامري", from: 21.5, to: 22.5, label: "٩:٣٠ الليل" },
];
const HARAJ: Ev = { name: "حراج القصب (مزاد تراثي)", from: "isha", label: "ساعة بعد العشاء" };
const TANASUB: Ev = { name: "ورشة فن التناسب (رسم)", from: 17, to: 21, label: "٥ – ٩ المساء" };
// Days of the 4th season (19–28 Nov 2026), from the guide's day-by-day table
const BY_DAY: Record<number, { title?: string; events: Ev[] }> = {
  19: { title: "الافتتاح", events: [...ARDAH] },
  20: { events: [...ARDAH, TANASUB, HARAJ] },
  21: {
    events: [
      ...ARDAH,
      TANASUB,
      { name: "سباق ملح القصب (١٫٤ و٥ و١٠ كم)", from: "asr", to: "sunset", label: "بعد العصر حتى الغروب" },
      { name: "ورشة دارة الملك عبدالعزيز (المسرح الثقافي)", from: "maghrib", label: "بعد صلاة المغرب" },
    ],
  },
  22: { events: [{ name: "تشجير القرية التراثية", from: 16, to: 18, label: "٤ – ٦ العصر" }, HARAJ] },
  23: {
    events: [
      { name: "قصة نجاح (دوار السعادة) · المسرح الثقافي", from: 17.5, to: 18.5, label: "٥:٣٠ العصر", ask: "وش برنامج «قصة نجاح (دوار السعادة)» في المسرح الثقافي؟" },
      { name: "قصص واقعية مع راوي · المسرح الثقافي", from: 19.5, to: 20.5, label: "٧:٣٠ الليل", ask: "وش برنامج «قصص واقعية» في المسرح الثقافي؟" },
    ],
  },
  24: { events: [HARAJ] },
  25: { events: [] },
  26: { events: [...ARDAH, HARAJ] },
  27: {
    events: [
      ...ARDAH,
      { name: "اصنع مشروعك التجاري بالذكاء الاصطناعي · المسرح الثقافي", from: 17.5, to: 18.5, label: "٥:٣٠ العصر", ask: "وش برنامج «اصنع مشروعك التجاري بالذكاء الاصطناعي» في المسرح الثقافي؟" },
    ],
  },
  28: { title: "الختام", events: [...ARDAH] },
};
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const ar = (n: number | string) => String(n).replace(/[0-9]/g, (c) => "٠١٢٣٤٥٦٧٨٩"[+c]);

function riyadhNow() {
  const r = new Date(Date.now() + 3 * 3600_000);
  return { y: r.getUTCFullYear(), m: r.getUTCMonth() + 1, d: r.getUTCDate(), wd: r.getUTCDay(), h: r.getUTCHours() + r.getUTCMinutes() / 60 };
}

function plan() {
  const now = riyadhNow();
  // After 11 pm the season is closed: show tomorrow
  let day = now.d, wd = now.wd, tomorrow = false;
  if (now.y === 2026 && now.m === 11 && now.h >= 23) { day += 1; wd = (wd + 1) % 7; tomorrow = true; }
  if (!(now.y === 2026 && now.m === 11 && day >= 19 && day <= 28)) return null;
  const p = prayerTimes(2026, 11, day);
  const at = (x: At | "sunset" | undefined, fallback: number) =>
    x === undefined ? fallback : x === "asr" ? p.asr + 0.25 : x === "maghrib" ? p.maghrib + 0.3 : x === "isha" ? p.isha + 0.3 : x === "sunset" ? p.maghrib : x;
  const rows = [...BY_DAY[day].events, ...DAILY]
    .map((e) => {
      const start = at(e.from, 0);
      const end = at(e.to, start + 1);
      const h = tomorrow ? -1 : now.h;
      const status = h < 0 || h < start ? (start - h <= 1.5 && h >= 0 ? `بعد ${ar(Math.max(1, Math.round((start - h) * 60)))} دقيقة` : "") : h < end ? "الحين" : "خلصت";
      return { ...e, start, status };
    })
    .sort((a, b) => a.start - b.start);
  const next = rows.find((r) => r.status !== "خلصت");
  return { day, wd, tomorrow, title: BY_DAY[day].title, rows, nextName: next ? next.name + next.label : "" };
}

export function TonightCard({ en, onAsk, onCall }: { en: boolean; onAsk: (q: string) => void; onCall: (el: HTMLElement) => void }) {
  const [, tick] = useState(0);
  const [all, setAll] = useState(false);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const p = plan();

  const shareText = en
    ? "Meet «Al-Dahiya», the smart old guide who knows everything about Al-Qasab and its Salt Season. Ask him or talk to him by voice: https://al-dahiah.com/?src=wa"
    : "تعرّف على «الداهية»، الشايب الذكي اللي يعرف كل شي عن القصب وموسم ملح القصب. اسأله أو كلّمه بصوتك: https://al-dahiah.com/?src=wa";

  return (
    <section className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]" aria-label={en ? "Talk to Al-Dahiya and tonight's events" : "كلّم الداهية وفعاليات الليلة"}>
      {/* Big call button + share */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={(e) => onCall(e.currentTarget)}
          className="group flex w-full items-center gap-4 rounded-[1.6rem] bg-gradient-to-l from-[#8f3d22] to-[#a5492a] px-5 py-4 text-start text-white shadow-lg shadow-[#a5492a]/25 ring-1 ring-[#d08372]/40 ring-inset transition hover:brightness-110 active:scale-[0.99]"
        >
          <span className="relative grid size-14 shrink-0 place-items-center rounded-full bg-white/15">
            <span className="absolute inset-0 animate-ping rounded-full bg-white/20" aria-hidden="true" />
            <Phone className="relative size-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-bold leading-tight">{en ? "Talk to Al-Dahiya" : "كلّم الداهية بصوتك"}</span>
            <span className="mt-0.5 block text-sm text-white/85">{en ? "Tap and talk, like any phone call" : "اضغط وتكلّم معه مثل أي مكالمة"}</span>
          </span>
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#cfe9d6] bg-[#f2fbf4] px-4 py-2.5 text-sm font-bold text-[#1f7a43] transition hover:bg-[#e6f6ea] active:scale-[0.99]"
        >
          <Send className="size-4" />
          {en ? "Send it to your family on WhatsApp" : "أرسل الداهية لأهلك في الواتساب"}
        </a>
      </div>

      {/* Tonight in the season (Arabic site only: the guide's events are in Arabic) */}
      {p && !en ? (
        <div className="card-contour heritage-frame rounded-[1.6rem] border border-[#e2d5c6] bg-white/95 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#3f2a22]">
              <CalendarDays className="size-5 text-[#a5492a]" />
              {p.tomorrow ? "بكرة في الموسم" : "الليلة في الموسم"}
            </h2>
            <span className="text-xs font-semibold text-[#6f5446]">
              {DAYS[p.wd]} {ar(p.day)} نوفمبر{p.title ? ` · ${p.title}` : ""} · ٤ العصر – ١١ الليل
            </span>
          </div>
          <ol className="mt-2 divide-y divide-[#f1e7dc]">
            {(all ? p.rows : p.rows.filter((r) => r.status !== "خلصت").slice(0, 4)).map((r, i) => {
              const isNext = r.name + r.label === p.nextName;
              const done = r.status === "خلصت";
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onAsk(r.ask || `وش «${r.name}» ووين مكانها؟`)}
                    className={`flex w-full items-center gap-3 py-2 text-start transition hover:bg-[#fbf6ee] ${done ? "opacity-45" : ""}`}
                  >
                    <span className={`w-[6.8rem] shrink-0 text-[11px] font-semibold ${isNext ? "text-[#a5492a]" : "text-[#6f5446]"}`}>{r.label}</span>
                    <span className={`min-w-0 flex-1 text-sm ${isNext ? "font-bold text-[#3f2a22]" : "text-[#3f2a22]"}`}>{r.name}</span>
                    {r.status && !done ? (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${r.status === "الحين" ? "bg-[#2f9e5b] text-white" : "bg-[#fbeee6] text-[#a5492a]"}`}>{r.status}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
          {p.rows.length > 4 || p.rows.some((r) => r.status === "خلصت") ? (
            <button type="button" onClick={() => setAll((x) => !x)} className="mt-1 text-xs font-bold text-[#a5492a]">
              {all ? "أقل" : `كل فعاليات ${p.tomorrow ? "بكرة" : "اليوم"} (${ar(p.rows.length)})`}
            </button>
          ) : null}
          <p className="mt-1 text-[11px] text-[#6f5446]">من دليل الزائر الرسمي، وغيرها فعاليات يومية كثيرة. اضغط أي فعالية تسأل الداهية عنها.</p>
        </div>
      ) : null}
    </section>
  );
}
