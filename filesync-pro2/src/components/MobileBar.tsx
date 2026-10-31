import React from "react";
import { LocateFixed, MessageCircle, Phone, Ticket, Compass } from "lucide-react";
import type { Language } from "../i18n";
import { openNearMe } from "./NearMe";

const TICKETS = "https://qasab-tickets.pages.dev";

// Phones and tablets: a fixed bottom bar with the four things a visitor at the season needs,
// the call raised in the middle. Desktop gets a floating call button instead.
export function MobileBar({
  language = "ar",
  onChat,
  onCall,
  onMore,
}: {
  language?: Language;
  onChat: () => void;
  onCall: () => void;
  onMore: () => void;
}) {
  const en = language === "en";
  const item = "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-bold text-[#6c3a1c] active:scale-95 transition";
  return (
    <nav
      dir={en ? "ltr" : "rtl"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6d5bd] bg-[#fdfaf5]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(58,42,28,0.12)] backdrop-blur-md lg:hidden"
      aria-label={en ? "Quick actions" : "اختصارات"}
    >
      <div className="mx-auto flex max-w-lg items-end px-2">
        <button type="button" onClick={onChat} className={item}>
          <MessageCircle className="size-5 text-[#94532d]" />
          {en ? "Chat" : "المحادثة"}
        </button>
        <button type="button" onClick={openNearMe} className={item}>
          <LocateFixed className="size-5 text-[#94532d]" />
          {en ? "Near me" : "قريب مني"}
        </button>
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onCall}
            className="relative -mt-6 mb-1 grid size-16 place-items-center rounded-full border-4 border-[#fdfaf5] bg-gradient-to-br from-[#94532d] to-[#5a3018] text-white shadow-lg active:scale-95"
            aria-label={en ? "Call Al-Dahiya" : "اتصل على الداهية"}
          >
            <span className="absolute size-14 animate-ping rounded-full bg-[#94532d]/25" />
            <Phone className="relative size-6 text-amber-100" />
          </button>
        </div>
        <a href={TICKETS} target="_blank" rel="noopener noreferrer" className={item}>
          <Ticket className="size-5 text-[#94532d]" />
          {en ? "Ticket" : "التذكرة"}
        </a>
        <button type="button" onClick={onMore} className={item}>
          <Compass className="size-5 text-[#94532d]" />
          {en ? "Season" : "الموسم"}
        </button>
      </div>
    </nav>
  );
}

export function FloatingCall({ language = "ar", onCall }: { language?: Language; onCall: () => void }) {
  const en = language === "en";
  return (
    <button
      type="button"
      onClick={onCall}
      className="fab-call fixed bottom-6 end-6 z-40 hidden items-center gap-2 rounded-full bg-gradient-to-br from-[#94532d] to-[#5a3018] py-3 ps-3 pe-5 text-sm font-bold text-white shadow-xl shadow-stone-900/25 hover:brightness-110 active:scale-95 lg:inline-flex"
    >
      <span className="relative grid size-9 place-items-center rounded-full bg-white/15">
        <span className="absolute inset-0 animate-ping rounded-full bg-amber-200/30" />
        <Phone className="relative size-4.5 text-amber-100" />
      </span>
      {en ? "Call Al-Dahiya" : "اتصل على الداهية"}
    </button>
  );
}
