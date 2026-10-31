import React, { useEffect, useMemo, useState } from "react";
import { Moon, Sunrise, Sun, CloudSun, Sunset, Clock } from "lucide-react";
import type { Language } from "../i18n";

// Prayer times for Al-Qasab, computed on the device (Umm Al-Qura method: Fajr at 18.5°,
// Isha 90 min after Maghrib, 120 min in Ramadan; Asr at shadow ratio 1). No network call.
const LAT = 25.2987;
const LNG = 45.505;
const TZ = 3;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const fix = (a: number, b: number) => ((a % b) + b) % b;
const sin = (d: number) => Math.sin(rad(d));
const cos = (d: number) => Math.cos(rad(d));
const tan = (d: number) => Math.tan(rad(d));
const arcsin = (x: number) => deg(Math.asin(x));
const arccos = (x: number) => deg(Math.acos(Math.max(-1, Math.min(1, x))));
const arctan2 = (y: number, x: number) => deg(Math.atan2(y, x));
const arccot = (x: number) => deg(Math.atan(1 / x));

function julian(y: number, m: number, d: number) {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * sin(g) + 0.02 * sin(2 * g), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
  const eqt = q / 15 - fix(RA, 24);
  const decl = arcsin(sin(e) * sin(L));
  return { decl, eqt };
}

/** Hours (local, fractional) of each time for the given Riyadh calendar day. */
export function prayerTimes(y: number, m: number, d: number, ramadan = false) {
  const jDate = julian(y, m, d) - LNG / (15 * 24);
  const midDay = (t: number) => fix(12 - sunPosition(jDate + t).eqt, 24);
  const angleTime = (angle: number, t: number, ccw: boolean) => {
    const { decl } = sunPosition(jDate + t);
    const noon = midDay(t);
    const T = arccos((-sin(angle) - sin(decl) * sin(LAT)) / (cos(decl) * cos(LAT))) / 15;
    return noon + (ccw ? -T : T);
  };
  const asr = (t: number) => {
    const { decl } = sunPosition(jDate + t);
    return angleTime(-arccot(1 + tan(Math.abs(LAT - decl))), t, false);
  };
  const adj = (h: number) => h + TZ - LNG / 15;
  const maghrib = adj(angleTime(0.833, 18 / 24, false));
  return {
    fajr: adj(angleTime(18.5, 5 / 24, true)),
    sunrise: adj(angleTime(0.833, 6 / 24, true)),
    dhuhr: adj(midDay(12 / 24)),
    asr: adj(asr(13 / 24)),
    maghrib,
    isha: maghrib + (ramadan ? 2 : 1.5),
  };
}

type Key = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
const ROWS: { key: Key; ar: string; en: string; Icon: typeof Sun }[] = [
  { key: "fajr", ar: "الفجر", en: "Fajr", Icon: Moon },
  { key: "sunrise", ar: "الشروق", en: "Sunrise", Icon: Sunrise },
  { key: "dhuhr", ar: "الظهر", en: "Dhuhr", Icon: Sun },
  { key: "asr", ar: "العصر", en: "Asr", Icon: CloudSun },
  { key: "maghrib", ar: "المغرب", en: "Maghrib", Icon: Sunset },
  { key: "isha", ar: "العشاء", en: "Isha", Icon: Moon },
];

function riyadhNow() {
  const now = new Date(Date.now() + TZ * 3600_000);
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate(), h: now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600 };
}

function fmtClock(h: number, en: boolean) {
  const total = Math.round(fix(h, 24) * 60);
  let hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  const pm = hh >= 12;
  hh = hh % 12 || 12;
  const t = `${hh}:${String(mm).padStart(2, "0")}`;
  if (en) return `${t} ${pm ? "PM" : "AM"}`;
  return `${t.replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[Number(c)])} ${pm ? "م" : "ص"}`;
}

function fmtLeft(hours: number, en: boolean) {
  const mins = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (en) return h ? `${h} h ${m} min` : `${m} min`;
  const n = (x: number) => x.toLocaleString("ar-SA");
  return h ? `${n(h)} ساعة و${n(m)} دقيقة` : `${n(m)} دقيقة`;
}

export function PrayerTimes({ language = "ar", onAsk }: { language?: Language; onAsk?: (q: string) => void }) {
  const en = language === "en";
  const [now, setNow] = useState(riyadhNow);
  useEffect(() => {
    const id = setInterval(() => setNow(riyadhNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  const ramadan = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric", timeZone: "Asia/Riyadh" }).format(new Date()) === "9";
    } catch {
      return false;
    }
  }, [now.d]);
  const times = useMemo(() => prayerTimes(now.y, now.m, now.d, ramadan), [now.y, now.m, now.d, ramadan]);
  const prayers = ROWS.filter((r) => r.key !== "sunrise");
  const next = prayers.find((r) => times[r.key] > now.h) || prayers[0];
  const left = next === prayers[0] && times.fajr <= now.h ? times.fajr + 24 - now.h : times[next.key] - now.h;

  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-[#e6d5bd] bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a1c]">
          <Clock className="size-4 text-[#94532d]" />
          {en ? "Prayer times in Al-Qasab" : "أوقات الصلاة في القَصَب"}
        </span>
        <span className="rounded-full border border-[#e4d2ba] bg-[#f3ebdf] px-2 py-0.5 text-[9px] font-bold text-[#94532d]">
          {en ? "Umm Al-Qura" : "تقويم أم القرى"}
        </span>
      </div>
      <div className="mt-3 rounded-2xl bg-gradient-to-l from-[#6c3a1c] to-[#94532d] px-3 py-2.5 text-white">
        <p className="text-[11px] text-white/80">{en ? "Next prayer" : "الصلاة الجاية"}</p>
        <p className="text-base font-bold">
          {en ? next.en : next.ar} · {fmtClock(times[next.key], en)}
        </p>
        <p className="text-[11px] text-white/85">{en ? `in ${fmtLeft(left, en)}` : `باقي ${fmtLeft(left, en)}`}</p>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {ROWS.map(({ key, ar, en: enName, Icon }) => (
          <div
            key={key}
            className={`rounded-xl border px-1.5 py-1.5 text-center ${
              key === next.key ? "border-[#94532d] bg-[#faf4ea]" : "border-[#ede0cb] bg-white"
            }`}
          >
            <Icon className="mx-auto size-3.5 text-[#94532d]" />
            <p className="mt-0.5 text-[10px] font-bold text-[#584535]">{en ? enName : ar}</p>
            <p className="text-[11px] font-bold tabular-nums text-[#3a2a1c]">{fmtClock(times[key], en)}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onAsk?.(en ? "Where is the nearest mosque?" : "وين أقرب مسجد؟")}
        className="mt-2.5 w-full rounded-xl border border-[#94532d] bg-white px-3 py-2 text-xs font-bold text-[#94532d] transition hover:bg-[#faf4ea] active:scale-[0.98]"
      >
        {en ? "Nearest mosque" : "وين أقرب مسجد؟"}
      </button>
    </div>
  );
}
