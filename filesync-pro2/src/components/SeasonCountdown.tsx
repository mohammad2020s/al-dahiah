import React, { useEffect, useState } from "react";
import { CalendarDays, PartyPopper, Ticket } from "lucide-react";
import type { Language } from "../i18n";

// The 4th Al-Qasab Salt Season (official poster): 19–28 November 2026, daily 4:00–11:00 pm,
// free entry with a registration ticket. Countdown to the start of 19 Nov (Riyadh time UTC+3).
const SEASON_START = Date.UTC(2026, 10, 18, 21, 0, 0);
// "It's on now" card until the end of 28 November (10 days)
const SEASON_SHOW_LIVE_MS = 10 * 24 * 3600 * 1000;
export const TICKETS_URL = "https://qasab-tickets.pages.dev";

function TicketLink({ isEn }: { isEn: boolean }) {
  return (
    <a
      href={TICKETS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="relative mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#B2512F] bg-white px-3 py-2 text-xs font-bold text-[#B2512F] hover:bg-[#F1E7E7] active:scale-[0.98] transition"
    >
      <Ticket className="size-4" />
      {isEn ? "Get your free ticket" : "سجّل واحصل على تذكرتك المجانية"}
    </a>
  );
}

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

export function SeasonCountdown({ language = "ar", onAsk }: { language?: Language; onAsk: (q: string) => void }) {
  const isEn = language === "en";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = SEASON_START - now;
  if (left < -SEASON_SHOW_LIVE_MS) return null;

  const num = (n: number) => new Intl.NumberFormat(isEn ? "en" : "ar-SA-u-nu-arab", { minimumIntegerDigits: 2 }).format(n);

  if (left <= 0) {
    return (
      <div className="sc-card relative overflow-hidden rounded-[1.7rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-[#7a1f18]">
          <PartyPopper className="size-5 text-amber-600" />
          {isEn ? "Al-Qasab Salt Season is on now!" : "موسم ملح القَصَب انطلق، حيّاكم!"}
        </div>
        <button
          onClick={() => onAsk(isEn ? "What's on at the Salt Season?" : "وش فعاليات موسم الملح؟")}
          className="mt-3 w-full rounded-xl bg-[#b82e24] px-3 py-2 text-xs font-bold text-white hover:bg-[#992017] active:scale-[0.98] transition"
        >
          {isEn ? "What's on?" : "وش فيه بالموسم؟"}
        </button>
        <p className="mt-2 text-center text-[11px] font-medium text-[#7d6564]">
          {isEn ? "Daily 4:00–11:00 pm until 28 November · free entry" : "يومياً من ٤ العصر إلى ١١ الليل حتى ٢٨ نوفمبر · الدخول مجاني"}
        </p>
        <TicketLink isEn={isEn} />
      </div>
    );
  }

  const { days, hours, minutes, seconds } = split(left);
  const units: [number, string, string][] = [
    [days, "يوم", "days"],
    [hours, "ساعة", "hours"],
    [minutes, "دقيقة", "min"],
    [seconds, "ثانية", "sec"],
  ];

  return (
    <div className="sc-card relative overflow-hidden rounded-[1.7rem] border border-[#EAD0CB] bg-white p-4 shadow-sm">
      {/* Salt crystals drifting in the background */}
      <div className="sc-salt pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#3a1210]">
            <CalendarDays className="size-4 text-[#B2512F]" />
            {isEn ? "Salt Season countdown" : "باقي على موسم ملح القَصَب"}
          </span>
          <span className="mt-1 inline-block rounded-full border border-[#EAD0CB] bg-[#F1E7E7] px-2 py-0.5 text-[9px] font-bold text-[#B2512F]">
            {isEn ? "4th edition · official" : "النسخة الرابعة · رسمي"}
          </span>
        </div>
        <img src="/images/salt-season-logo.png" alt={isEn ? "Malh Al-Qasab logo" : "شعار ملح القصب"} className="h-14 w-auto shrink-0" />
      </div>
      <div className="relative mt-3 grid grid-cols-4 gap-1.5" dir={isEn ? "ltr" : "rtl"}>
        {units.map(([value, ar, en]) => (
          <div key={en} className="rounded-2xl bg-gradient-to-b from-[#D18372] to-[#B2512F] px-1 py-2 text-center text-white shadow-sm">
            <span key={value} className="sc-tick block text-xl font-bold leading-none tabular-nums">{num(value)}</span>
            <span className="mt-1 block text-[10px] text-white/80">{isEn ? en : ar}</span>
          </div>
        ))}
      </div>
      <p className="relative mt-2.5 text-center text-[11px] font-medium text-[#7d6564]">
        {isEn ? `19–28 November 2026 · daily 4:00–11:00 pm · free entry` : `من ١٩ إلى ٢٨ نوفمبر ٢٠٢٦ · يومياً ٤ العصر – ١١ الليل · الدخول مجاني`}
      </p>
      <TicketLink isEn={isEn} />
    </div>
  );
}
