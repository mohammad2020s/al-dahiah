import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Footprints, Map as MapIcon, MessageCircle, Navigation, X } from "lucide-react";
import { AL_QASAB_CAFES, AL_QASAB_LANDMARKS } from "../../server/alQasabScope.ts";
import type { Language } from "../i18n";
import { LeafletMap, type MapPoint } from "./LeafletMap";
import { openNavigation } from "./NavigateSheet";

// A half-day route through Al-Qasab, ordered for the light: salt pans in the
// soft morning, the old town midday, the watchtower at sunset, coffee after,
// then a night out on Al-Sabkha (a separate place from the salt pans).
type Stop = {
  landmarkId: string;
  timeAr: string;
  timeEn: string;
  titleAr: string;
  titleEn: string;
  tipAr: string;
  tipEn: string;
  askAr: string;
  askEn: string;
};

const STOPS: Stop[] = [
  {
    landmarkId: "salt_flat",
    timeAr: "الصبح بدري",
    timeEn: "Early morning",
    titleAr: "مَمْلَحَة القَصَب والجِفار",
    titleEn: "Al-Qasab salt pans",
    tipAr: "شوف أحواض الماء المالح وأكوام الملح الأبيض مثل التلال، والشمس الهادية تخلي الصور تجنن. ومملحة المقحم النموذجية مكان ثاني قريب منها، فيها ممشى خشبي وأكواخ خوص.",
    tipEn: "See the brine basins and hills of white salt in the soft light. The Al-Muqhim model salt pan, with its wooden walkway and reed huts, is a separate place nearby.",
    askAr: "علمني عن ممالح القصب",
    askEn: "Tell me about the Al-Qasab salt pans",
  },
  {
    landmarkId: "ibn_zahim_palace",
    timeAr: "قبل الظهر",
    timeEn: "Late morning",
    titleAr: "قصر الزاحم التاريخي",
    titleEn: "Al-Zahim historic palace",
    tipAr: "جنب الجامع في البلدة القديمة، فيه وثائق وصور من تاريخ الدولة ومرشدين وضيافة.",
    tipEn: "Beside the old mosque: documents and photos from the history of the Saudi state.",
    askAr: "علمني عن قصر الزاحم",
    askEn: "Tell me about Al-Zahim palace",
  },
  {
    landmarkId: "heritage_village",
    timeAr: "العصر",
    timeEn: "Afternoon",
    titleAr: "البلدة القديمة وسوق العبيدي",
    titleEn: "Old town & Souq Al-Obaidi",
    tipAr: "تمشّى بين بيوت الطين، وشوف سوق العبيدي ومبنى القصبي التراثي ومنزل الراشد.",
    tipEn: "Wander the mud-brick lanes, Souq Al-Obaidi, the Al-Qusaibi building and Al-Rashid house.",
    askAr: "وش سوق العبيدي؟",
    askEn: "What is Souq Al-Obaidi?",
  },
  {
    landmarkId: "al_marqab",
    timeAr: "المغرب",
    timeEn: "Sunset",
    titleAr: "مرقب القَصَب",
    titleEn: "Al-Qasab watchtower",
    tipAr: "اطلع للمرقب وقت الغروب وشوف القَصَب كلها من فوق.",
    tipEn: "Climb up at sunset for a view over the whole town.",
    askAr: "وش قصة المرقب؟",
    askEn: "Tell me about the watchtower",
  },
  {
    landmarkId: "bdor_coffee",
    timeAr: "بعد المغرب",
    timeEn: "Evening",
    titleAr: "فنجال قهوة في القرية التراثية",
    titleEn: "Coffee in the heritage village",
    tipAr: "اختم يومك بقهوة سعودية وتمر في قهوة بدور إبراهيم.",
    tipEn: "End the day with Saudi coffee and dates at Bdor Ibrahim.",
    askAr: "وش أفضل المقاهي في القصب؟",
    askEn: "What are the best cafes in Al-Qasab?",
  },
  {
    landmarkId: "sabkha",
    timeAr: "الليل",
    timeEn: "Night",
    titleAr: "الصْبَخَة",
    titleEn: "Al-Sabkha",
    tipAr: "اختم ليلتك بفرشة وقهوة على أرض الصْبَخَة، جوها أبرد بالصيف وأنوار البلد على الأفق.",
    tipEn: "End the night on a rug with coffee on the open plain; cooler in summer, town lights on the horizon.",
    askAr: "وش قصة الصبخة؟",
    askEn: "What is Al-Sabkha?",
  },
];

function useStops(isEn: boolean) {
  return useMemo(
    () =>
      STOPS.map((s, i) => {
        const lm = [...AL_QASAB_LANDMARKS, ...AL_QASAB_CAFES].find((l) => l.id === s.landmarkId);
        return lm ? { ...s, index: i + 1, lat: lm.coordinates.lat, lng: lm.coordinates.lng, title: isEn ? s.titleEn : s.titleAr } : null;
      }).filter(Boolean) as (Stop & { index: number; lat: number; lng: number; title: string })[],
    [isEn]
  );
}

export function TourRoute({ language = "ar", onAsk }: { language?: Language; onAsk: (q: string) => void }) {
  const isEn = language === "en";
  const stops = useStops(isEn);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const points: MapPoint[] = useMemo(
    () => stops.map((s) => ({ id: s.landmarkId, lat: s.lat, lng: s.lng, title: s.title, label: String(s.index) })),
    [stops]
  );
  const onSelect = useCallback((id: string) => {
    setActiveId(id);
    document.getElementById(`tour-stop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <>
      <div className="sc-card rounded-[1.7rem] border border-[#e6d5bd] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a1c]">
          <Footprints className="size-4 text-[#94532d]" />
          {isEn ? "Your day in Al-Qasab" : "جولتك في القَصَب"}
        </div>
        <ol className="mt-3 space-y-1.5">
          {stops.map((s) => (
            <li key={s.landmarkId} className="flex items-center gap-2 text-[11px] text-[#4a2f2d]">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#94532d] text-[10px] font-bold text-white">{s.index}</span>
              <span className="font-semibold">{s.title}</span>
              <span className="ms-auto shrink-0 text-[10px] text-[#947760]">{isEn ? s.timeEn : s.timeAr}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={() => setOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#94532d] px-3 py-2 text-xs font-bold text-white hover:bg-[#78411f] active:scale-[0.98] transition"
        >
          <MapIcon className="size-4" />
          {isEn ? "Show the route on the map" : "اعرض الجولة على الخريطة"}
        </button>
      </div>

      {open &&
        createPortal(
          <div className="pg-viewer fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-6" onClick={() => setOpen(false)}>
            <div
              dir={isEn ? "ltr" : "rtl"}
              onClick={(e) => e.stopPropagation()}
              className="tr-sheet flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.8rem] sm:rounded-[1.8rem] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#ede1cd] px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold text-[#3a2a1c]">{isEn ? "Your day in Al-Qasab" : "جولتك في القَصَب"}</p>
                  <p className="text-[11px] text-[#786450]">{isEn ? "A half-day route, best started early" : "جولة نص يوم، والأفضل تبدأها بدري"}</p>
                </div>
                <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-[#faf4ea] text-[#6c3a1c] hover:bg-[#f5eadb]" title={isEn ? "Close" : "إغلاق"}>
                  <X className="size-5" />
                </button>
              </div>
              <LeafletMap points={points} activeId={activeId} route onSelect={onSelect} className="h-60 sm:h-72 shrink-0" />
              <ol className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                {stops.map((s) => (
                  <li
                    key={s.landmarkId}
                    id={`tour-stop-${s.landmarkId}`}
                    onClick={() => setActiveId(s.landmarkId)}
                    className={`tr-stop flex gap-3 rounded-2xl border p-3 transition cursor-pointer ${
                      activeId === s.landmarkId ? "border-teal-600 bg-teal-50/60" : "border-[#e7d8c2] bg-white hover:bg-[#fcf8f1]"
                    }`}
                    style={{ animationDelay: `${s.index * 60}ms` }}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#94532d] text-xs font-bold text-white">{s.index}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-bold text-[#33251a]">{s.title}</span>
                        <span className="text-[11px] font-semibold text-[#a8744a]">{isEn ? s.timeEn : s.timeAr}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#584535]">{isEn ? s.tipEn : s.tipAr}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openNavigation({ lat: s.lat, lng: s.lng, name: s.title });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#94532d] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#78411f]"
                        >
                          <Navigation className="size-3.5" />
                          {isEn ? "Take me there" : "خذني لها"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            onAsk(isEn ? s.askEn : s.askAr);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#e6d5bd] bg-[#faf4ea] px-2.5 py-1.5 text-[11px] font-bold text-[#6c3a1c] hover:bg-[#f5eadb]"
                        >
                          <MessageCircle className="size-3.5" />
                          {isEn ? "Ask Al-Dahiya" : "اسأل الداهية"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
