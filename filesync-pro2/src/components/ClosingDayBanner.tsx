import React from "react";
import { PartyPopper, Star } from "lucide-react";
import { openSurvey } from "./SeasonSurvey";

// «اليوم الختام»: shown on its own on Sat 28 Nov 2026 (Riyadh time), the last day of the 4th season,
// and gone the next day (owner, 27 Nov). ?closing shows it on any day, to preview it.
export const closingDay = () => {
  try { if (new URLSearchParams(window.location.search).has("closing")) return true; } catch {}
  const r = new Date(Date.now() + 3 * 3600_000);
  return r.getUTCFullYear() === 2026 && r.getUTCMonth() === 10 && r.getUTCDate() === 28;
};

export function ClosingDayBanner({ en }: { en: boolean }) {
  if (!closingDay()) return null;
  const events = en
    ? [["First-aid course", "5:30 pm (Maghrib)"], ["Saudi Ardah", "after Maghrib & Isha"], ["Samri", "9:30 pm"]]
    : [["دورة في الإسعافات الأولية", "٥:٣٠ المغرب"], ["العرضة السعودية", "بعد المغرب والعشاء"], ["السامري", "٩:٣٠ الليل"]];
  return (
    <section
      dir={en ? "ltr" : "rtl"}
      className="pg-enter relative mt-4 w-full overflow-hidden rounded-[1.7rem] border-2 border-[#e0a03a] bg-gradient-to-l from-[#8f3d22] to-[#a5492a] p-4 text-[#fbf6ee] shadow-lg"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#fbf6ee]/15">
          <PartyPopper className="size-6 text-[#ffd9a0]" />
        </span>
        <div>
          <h2 className="text-lg font-bold leading-snug">
            {en ? "Today is the closing day!" : "اليوم الختام!"}
          </h2>
          <p className="text-sm text-[#ffe1d3]">
            {en ? "Last chance to visit the 4th Al-Qasab Salt Season" : "آخر فرصة تزور موسم ملح القصب الرابع"}
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {events.map(([name, time]) => (
          <li key={name} className="flex items-center justify-between gap-3 rounded-xl bg-[#fbf6ee]/12 px-3 py-2 text-sm">
            <span className="font-bold">{name}</span>
            <span className="shrink-0 text-xs font-semibold text-[#ffd9a0]">{time}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#ffe1d3]">
          {en ? "4 pm – 11 pm · free entry" : "٤ العصر – ١١ الليل · الدخول مجاني"}
        </span>
        <button
          type="button"
          onClick={openSurvey}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#fbf6ee] px-3 py-1.5 text-xs font-bold text-[#8f3d22] transition active:scale-95"
        >
          <Star className="size-4 fill-[#e0a03a] text-[#e0a03a]" />
          {en ? "Rate the season" : "قيّم الموسم"}
        </button>
      </div>
    </section>
  );
}
