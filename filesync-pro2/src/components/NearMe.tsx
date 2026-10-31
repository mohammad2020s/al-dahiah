import React, { useCallback, useEffect, useState } from "react";
import { Coffee, Loader2, LocateFixed, MapPin, Navigation, Toilet, X } from "lucide-react";
import type { Language } from "../i18n";
import { AL_QASAB_CAFES, AL_QASAB_MOSQUES, RESTROOMS_LOCATION } from "../../server/alQasabScope.ts";
import { openNavigation } from "./NavigateSheet";

// «قريب مني الحين»: one tap shows the nearest mosque, restroom and café with the walking
// distance, each with a «خذني» button into the in-site directions. If the location is off or the
// visitor is far from Al-Qasab, distances are measured from the heritage village instead.
const EVENT = "dahiah:nearme";
export const openNearMe = () => window.dispatchEvent(new Event(EVENT));

const VILLAGE = { lat: 25.2992, lng: 45.5062 };
type Spot = { name: string; nameEn: string; lat: number; lng: number };

const MOSQUES: Spot[] = AL_QASAB_MOSQUES.map((m) => ({ name: m.name, nameEn: m.nameEn, lat: m.lat, lng: m.lng }));
const WCS: Spot[] = RESTROOMS_LOCATION.pins.map((p) => ({ name: p.name, nameEn: p.nameEn, lat: p.lat, lng: p.lng }));
const CAFES: Spot[] = AL_QASAB_CAFES.map((c) => ({
  name: c.name.replace(/\s*\([^)]*\)/, ""),
  nameEn: (c.name.match(/\(([^)]*)\)/) || [])[1] || c.name,
  lat: c.coordinates.lat,
  lng: c.coordinates.lng,
}));

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function nearest(list: Spot[], from: { lat: number; lng: number }, n = 2) {
  return list
    .map((s) => ({ ...s, d: km(from, s) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
}

function fmtDist(d: number, en: boolean) {
  const walkMin = Math.max(1, Math.round((d * 1000) / 75));
  const n = (x: number) => (en ? String(x) : x.toLocaleString("ar-SA"));
  if (d < 1) {
    const m = Math.round((d * 1000) / 10) * 10;
    if (en) return `${m} m, ${walkMin} min walk`;
    return `${n(m)} متر، ${walkMin === 1 ? "دقيقة مشي" : walkMin === 2 ? "دقيقتين مشي" : `${n(walkMin)} دقايق مشي`}`;
  }
  const k = Math.round(d * 10) / 10;
  return en ? `${k} km` : `${n(k)} كيلو`;
}

export function NearMe({ language = "ar" }: { language?: Language }) {
  const en = language === "en";
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<{ lat: number; lng: number } | null>(null);
  const [fromVillage, setFromVillage] = useState<"" | "far" | "off">("");
  const [busy, setBusy] = useState(false);

  const locate = useCallback(() => {
    setBusy(true);
    const fallback = (why: "far" | "off") => {
      setFrom(VILLAGE);
      setFromVillage(why);
      setBusy(false);
    };
    if (!navigator.geolocation) return fallback("off");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (km(here, VILLAGE) > 25) return fallback("far");
        setFrom(here);
        setFromVillage("");
        setBusy(false);
      },
      () => fallback("off"),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60_000 }
    );
  }, []);

  useEffect(() => {
    const on = () => {
      setOpen(true);
      locate();
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [locate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const groups = from
    ? [
        { key: "mosque", title: en ? "Nearest mosque" : "أقرب مسجد", Icon: MapPin, items: nearest(MOSQUES, from) },
        { key: "wc", title: en ? "Nearest restroom" : "أقرب دورة مياه", Icon: Toilet, items: nearest(WCS, from) },
        { key: "cafe", title: en ? "Nearest café" : "أقرب مقهى", Icon: Coffee, items: nearest(CAFES, from) },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center" onClick={() => setOpen(false)}>
      <div
        dir={en ? "ltr" : "rtl"}
        onClick={(e) => e.stopPropagation()}
        className="tr-sheet max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[1.8rem] border border-[#e6d5bd] bg-[#fdfaf5] p-4 pb-6 shadow-2xl sm:rounded-[1.8rem]"
      >
        <div className="sadu-strip -mx-4 -mt-4 mb-3 rounded-t-[1.8rem]" />
        <div className="flex items-center justify-between">
          <h2 className="font-['Alexandria'] flex items-center gap-2 text-lg font-bold text-[#3a2a1c]">
            <LocateFixed className="size-5 text-[#94532d]" />
            {en ? "Near me now" : "قريب مني الحين"}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-9 place-items-center rounded-full bg-[#f3ebdf] text-[#6c3a1c] hover:bg-[#eadbc6]"
            aria-label={en ? "Close" : "إغلاق"}
          >
            <X className="size-4" />
          </button>
        </div>

        {busy && (
          <p className="mt-6 flex items-center justify-center gap-2 py-6 text-sm font-semibold text-[#6c3a1c]">
            <Loader2 className="size-4 animate-spin" />
            {en ? "Finding where you are…" : "أشوف وينك…"}
          </p>
        )}

        {!busy && fromVillage && (
          <p className="mt-2 rounded-xl bg-[#f3ebdf] px-3 py-2 text-xs leading-5 text-[#6c3a1c]">
            {fromVillage === "far"
              ? en
                ? "You seem to be outside Al-Qasab, so distances are from the heritage village."
                : "يبان إنك برّا القَصَب، فحسبت المسافات من القرية التراثية."
              : en
                ? "Location is off, so distances are from the heritage village. Turn location on for exact ones."
                : "الموقع مقفل، فحسبت المسافات من القرية التراثية. شغّل الموقع عشان تطلع لك بالضبط."}
          </p>
        )}

        {!busy &&
          groups.map(({ key, title, Icon, items }) => (
            <div key={key} className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#94532d]">
                <Icon className="size-4" />
                {title}
              </p>
              <div className="space-y-1.5">
                {items.map((s, i) => (
                  <div
                    key={s.name}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 ${i === 0 ? "border-[#d9c09f] bg-white" : "border-[#ede0cb] bg-white/70"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#3a2a1c]">{en ? s.nameEn : s.name}</p>
                      <p className="text-xs text-[#786450]">{fmtDist(s.d, en)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        openNavigation({ lat: s.lat, lng: s.lng, name: en ? s.nameEn : s.name });
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#94532d] px-3 py-2 text-xs font-bold text-white hover:bg-[#78411f] active:scale-95"
                    >
                      <Navigation className="size-3.5" />
                      {en ? "Take me" : "خذني"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
