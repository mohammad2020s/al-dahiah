import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { Language } from "../i18n";

// Photos of Al-Qasab drifting behind the whole site: each one stays ~6 s with a slow
// "Ken Burns" zoom, then cross-fades into the next. A sand-coloured veil keeps every card
// readable. Only the current and the next photo are loaded at any time.
const SLIDES: { src: string; ar: string; en: string; ask: { ar: string; en: string } }[] = [
  { src: "/images/bg/mamlaha-harvest.jpg", ar: "مَمَالح القَصَب (الجِفار)", en: "Al-Qasab salt pans (Al-Jifar)", ask: { ar: "حدثني عن ممالح القصب", en: "Tell me about the Al-Qasab salt pans" } },
  { src: "/images/bg/village-gate-season.jpg", ar: "بوابة القرية التراثية أيام الموسم", en: "The heritage village gate during the season", ask: { ar: "وش محطات الموسم؟", en: "What are the season's stations?" } },
  { src: "/images/bg/mamlaha-salt-heaps.jpg", ar: "تلال الذهب الأبيض", en: "Hills of white gold", ask: { ar: "كيف يستخرجون الملح؟", en: "How is the salt made?" } },
  { src: "/images/bg/souq-street.jpg", ar: "سوق العبيدي", en: "Souq Al-Obaidi", ask: { ar: "وش سوق العبيدي؟", en: "What is Souq Al-Obaidi?" } },
  { src: "/images/bg/muqhim-wooden-bridge.jpg", ar: "مَمْلَحَة المقحم النموذجية", en: "Al-Muqhim model salt pan", ask: { ar: "وريني مملحة المقحم", en: "Show me Al-Muqhim salt pan" } },
  { src: "/images/bg/rashid-wall-towers.jpg", ar: "سور البلدة وأبراجها", en: "The old town wall and towers", ask: { ar: "وش قصة أبواب القصب؟", en: "What's the story of Al-Qasab's gates?" } },
  { src: "/images/bg/mamlaha-green-pool.jpg", ar: "أحواض الماء المالح", en: "Brine pools", ask: { ar: "كيف يستخرجون الملح؟", en: "How is the salt made?" } },
  { src: "/images/bg/mamlaha-salt-hill.jpg", ar: "جبل الملح", en: "A mountain of salt", ask: { ar: "كم تنتج القصب من الملح؟", en: "How much salt does Al-Qasab produce?" } },
  { src: "/images/bg/sabkha-night.jpg", ar: "ليل الصْبَخَة", en: "A night on Al-Sabkha", ask: { ar: "وش قصة الصبخة؟", en: "What is Al-Sabkha?" } },
];
const HOLD_MS = 6000;

export function BackgroundSlideshow({ language = "ar", onAsk }: { language?: Language; onAsk?: (q: string) => void }) {
  const en = language === "en";
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Preload the next photo; only move on once it is ready (no blank flashes on slow networks)
  useEffect(() => {
    const next = (index + 1) % SLIDES.length;
    for (const i of [index, next]) {
      if (loaded[i]) continue;
      const img = new Image();
      img.onload = () => setLoaded((l) => ({ ...l, [i]: true }));
      img.src = SLIDES[i].src;
    }
  }, [index, loaded]);

  useEffect(() => {
    const next = (index + 1) % SLIDES.length;
    if (!loaded[next]) return;
    const id = setTimeout(() => setIndex(next), HOLD_MS);
    return () => clearTimeout(id);
  }, [index, loaded]);

  // Pause while the tab is hidden (saves data and battery)
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) setLoaded((l) => ({ ...l }));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const current = SLIDES[index];
  return (
    <>
      <div className="bgs-root pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {SLIDES.map((s, i) =>
          loaded[i] ? (
            <div
              key={s.src}
              className={`bgs-slide ${i === index ? "bgs-on" : ""} ${reduced ? "" : i % 2 ? "bgs-kb-b" : "bgs-kb-a"}`}
              style={{ backgroundImage: `url(${s.src})` }}
            />
          ) : null
        )}
        {/* Sand veil: photos show through softly, text stays readable */}
        <div className="bgs-veil absolute inset-0" />
      </div>
      {loaded[index] && (
        <button
          type="button"
          onClick={() => onAsk?.(en ? current.ask.en : current.ask.ar)}
          className="bgs-caption fixed bottom-3 start-3 z-[5] hidden items-center gap-1.5 rounded-full border border-white/50 bg-[#3a2a1c]/55 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-[#3a2a1c]/75 sm:flex"
          title={en ? "Ask the guide about this place" : "اسأل الداهية عن هالمكان"}
          key={current.src}
        >
          <MapPin className="size-3.5" />
          {en ? current.en : current.ar}
        </button>
      )}
    </>
  );
}
