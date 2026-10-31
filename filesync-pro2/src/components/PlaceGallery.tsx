import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, Images, X } from "lucide-react";
import type { Language } from "../i18n";

export type PlaceImage = { src: string; caption: string; credit?: string };

// Real photos of the place an answer talks about: a large main photo with its caption,
// thumbnails to switch, and a full-screen viewer (swipe / arrows / Esc).
export function PlaceGallery({ images, language = "ar" }: { images: PlaceImage[]; language?: Language }) {
  const isEn = language === "en";
  const [active, setActive] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const go = useCallback((delta: number) => setActive((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setViewerOpen(false);
      // In RTL the "next" arrow points left
      if (e.key === "ArrowLeft") go(isEn ? -1 : 1);
      if (e.key === "ArrowRight") go(isEn ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, go, isEn]);

  if (!count) return null;
  const current = images[active];

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      touchStartX.current = null;
      if (Math.abs(dx) > 40) go((dx < 0 ? 1 : -1) * (isEn ? 1 : -1));
    },
  };

  return (
    <div className="pg-enter mt-2 w-full max-w-md rounded-3xl border border-[#e6d5bd] bg-white p-2.5 shadow-sm">
      <div className="flex items-center justify-between px-1.5 pb-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#5c331b]">
          <Images className="size-4 text-[#94532d]" />
          {isEn ? "Real photos" : "صور حقيقية من المكان"}
        </span>
        <span dir="ltr" className="text-[11px] font-medium text-[#947760] tabular-nums">
          {active + 1} / {count}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        {...swipeHandlers}
        className="group relative block w-full overflow-hidden rounded-2xl bg-[#2a2016] aspect-[4/3] focus-visible:outline-2 focus-visible:outline-[#94532d]"
        title={isEn ? "Open full screen" : "عرض بملء الشاشة"}
      >
        <img
          key={current.src}
          src={current.src}
          alt={current.caption}
          loading="lazy"
          // A wide chart (like the season's location key) is shown whole instead of cropped
          onLoad={(e) => {
            const im = e.currentTarget;
            const wide = im.naturalWidth / Math.max(1, im.naturalHeight) > 1.8;
            im.style.objectFit = wide ? "contain" : "";
            im.style.background = wide ? "#f1e8df" : "";
          }}
          className="pg-fade size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-10 text-start">
          <p className="text-sm font-semibold text-white drop-shadow">{current.caption}</p>
          {current.credit && <p className="mt-0.5 text-[10px] text-white/70">{current.credit}</p>}
        </div>
        <span className="absolute top-2.5 end-2.5 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-80 group-hover:opacity-100 transition">
          <Expand className="size-4" />
        </span>
      </button>

      {count > 1 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-0.5 snap-x">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActive(i)}
              style={{ animationDelay: `${80 + i * 60}ms` }}
              className={`pg-thumb relative size-16 shrink-0 snap-start overflow-hidden rounded-xl transition ${
                i === active ? "ring-2 ring-[#94532d] ring-offset-2" : "opacity-70 hover:opacity-100"
              }`}
              title={img.caption}
            >
              <img src={img.src} alt={img.caption} loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {viewerOpen && createPortal(
        <div
          className="pg-viewer fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/92 p-4 backdrop-blur-sm"
          onClick={() => setViewerOpen(false)}
          dir={isEn ? "ltr" : "rtl"}
        >
          <button
            type="button"
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 end-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            title={isEn ? "Close" : "إغلاق"}
          >
            <X className="size-5" />
          </button>
          <img
            key={`viewer-${current.src}`}
            src={current.src}
            alt={current.caption}
            onClick={(e) => e.stopPropagation()}
            {...swipeHandlers}
            className="pg-zoom max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
          <p className="mt-4 text-center text-sm font-semibold text-white">{current.caption}</p>
          {current.credit && <p className="mt-0.5 text-center text-[11px] text-white/60">{current.credit}</p>}
          <p dir="ltr" className="mt-1 text-xs text-white/60 tabular-nums">
            {active + 1} / {count}
          </p>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute start-3 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                title={isEn ? "Previous" : "السابقة"}
              >
                {isEn ? <ChevronLeft className="size-6" /> : <ChevronRight className="size-6" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute end-3 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                title={isEn ? "Next" : "التالية"}
              >
                {isEn ? <ChevronRight className="size-6" /> : <ChevronLeft className="size-6" />}
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
