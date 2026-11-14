import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, ExternalLink, Map as MapIcon, Minus, Navigation, Plus, X, LocateFixed } from "lucide-react";
import type { Language } from "../i18n";
import { VENUE_MAP, VENUE_NODES, venueNode, venueRoute, nearestNode } from "../../server/venueMap";

// The official season map (A2 PDF) in a framed viewer: pins for every station, «أنت هنا» where the
// visitor taps or picks, the walking route drawn on the map, and step-by-step directions.
const EVENT = "dahiah:open-venue-map";
type Target = { to?: string; from?: string };
export const openVenueMap = (t: Target = {}) => window.dispatchEvent(new CustomEvent<Target>(EVENT, { detail: t }));

const W = VENUE_MAP.width;
const H = VENUE_MAP.height;
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

export function VenueMap({ language = "ar" }: { language?: Language }) {
  const en = language === "en";
  const [open, setOpen] = useState(false);
  const [toId, setToId] = useState<string>("");
  const [here, setHere] = useState<{ x: number; y: number; id?: string }>(() => {
    const e = venueNode("E")!;
    return { x: e.x, y: e.y, id: "E" };
  });
  const [zoom, setZoom] = useState(1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<Target>).detail || {};
      const f = d.from ? venueNode(d.from) : null;
      if (f) setHere({ x: f.x, y: f.y, id: f.id });
      setToId(d.to || "");
      setZoom(window.innerWidth < 700 ? 2.2 : 1.2);
      setOpen(true);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [open]);

  const route = useMemo(() => (toId ? venueRoute(here, toId) : null), [here, toId]);
  const dest = route ? route.points[route.points.length - 1] : null;
  const destNode = toId ? (toId.startsWith("WC") && dest ? nearestNode(dest[0], dest[1], ["service"]) : venueNode(toId)) : null;
  const hereNode = here.id ? venueNode(here.id) : nearestNode(here.x, here.y);

  // Keep the visitor's spot and the destination in view
  useEffect(() => {
    if (!open || !box.current) return;
    const el = box.current;
    const t = setTimeout(() => {
      const pts = route ? [route.points[0], route.points[route.points.length - 1]] : [[here.x, here.y] as [number, number]];
      const cx = (pts[0][0] + pts[pts.length - 1][0]) / 2, cy = (pts[0][1] + pts[pts.length - 1][1]) / 2;
      const iw = el.scrollWidth, ih = el.scrollHeight;
      // scrollLeft is measured from the left even in an RTL page (the box is LTR)
      el.scrollTo({ left: (cx / W) * iw - el.clientWidth / 2, top: (cy / H) * ih - el.clientHeight / 2, behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [open, route, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const name = (id?: string) => {
    const n = id ? venueNode(id) : null;
    return n ? (en ? n.en : n.ar) : "";
  };
  const label = (n: { no?: number; ar: string; en: string }) => (n.no ? `${en ? n.no : toArabicDigits(n.no)} · ` : "") + (en ? n.en : n.ar);

  // A tap on the map: on a pin → go there; anywhere else → «أنت هنا»
  const onMapTap = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    setHere({ x, y });
  };

  const options = VENUE_NODES.filter((n) => !n.id.startsWith("WC"));
  const stroke = Math.max(4, 9 / zoom);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1c0f07]/70 p-2 backdrop-blur-sm sm:p-5" dir={en ? "ltr" : "rtl"} role="dialog" aria-modal="true" aria-label={en ? "Season map" : "خريطة الموسم"} onClick={() => setOpen(false)}>
      <div className="venue-frame relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[26px] bg-[#fbf3e4] text-[#2b1a10]" onClick={(e) => e.stopPropagation()}>
        <div className="merlons absolute inset-x-0 top-0 h-[13px] opacity-90" aria-hidden="true" />
        {/* header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e6d5bd] bg-[#4a2614] px-4 pb-3 pt-5 text-[#fbf3e4]">
          <MapIcon className="size-5 text-[#d6a84a]" />
          <h2 className="me-auto text-lg font-extrabold">{en ? "Salt Season map" : "خريطة موسم ملح القْصَب"}</h2>
          <a href={VENUE_MAP.pdf} download="خريطة-موسم-ملح-القصب.pdf" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#d6a84a] px-3 text-sm font-bold text-[#2b1a10] hover:brightness-110">
            <Download className="size-4" /> {en ? "Download PDF" : "حمّل PDF"}
          </a>
          <a href={VENUE_MAP.pdf} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#d6a84a]/70 px-3 text-sm font-bold hover:bg-white/10">
            <ExternalLink className="size-4" /> {en ? "Open" : "افتح"}
          </a>
          <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl hover:bg-white/10" aria-label={en ? "Close" : "إغلاق"}>
            <X className="size-5" />
          </button>
        </div>

        {/* where you are / where to */}
        <div className="grid gap-2 border-b border-[#e6d5bd] px-4 py-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-bold">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#1d6fd8] text-white"><LocateFixed className="size-4" /></span>
            <span className="shrink-0">{en ? "You are at" : "أنت عند"}</span>
            <select
              className="min-h-10 w-full rounded-xl border border-[#e6d5bd] bg-white px-2 text-sm"
              value={here.id || ""}
              onChange={(e) => { const n = venueNode(e.target.value); if (n) setHere({ x: n.x, y: n.y, id: n.id }); }}
            >
              {!here.id && <option value="">{en ? `Your tap (near ${hereNode ? (en ? hereNode.en : hereNode.ar) : ""})` : `مكان ضغطتك (قرب ${hereNode ? hereNode.ar : ""})`}</option>}
              {options.map((n) => <option key={n.id} value={n.id}>{label(n)}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#b42318] text-white"><Navigation className="size-4" /></span>
            <span className="shrink-0">{en ? "Going to" : "تبي تروح"}</span>
            <select className="min-h-10 w-full rounded-xl border border-[#e6d5bd] bg-white px-2 text-sm" value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">{en ? "Choose a place…" : "اختر مكان…"}</option>
              {options.map((n) => <option key={n.id} value={n.id}>{label(n)}</option>)}
              <option value="WC2">{en ? "Nearest restroom" : "أقرب دورة مياه"}</option>
            </select>
          </label>
          <p className="text-xs text-[#7a5a45] sm:col-span-2">{en ? "Tip: tap the map where you are standing to set «You are here»; tap a number to go there." : "تلميح: اضغط على الخريطة مكان ما أنت واقف عشان يحدد «أنت هنا»، واضغط على أي رقم عشان يدلك عليه."}</p>
        </div>

        {/* the map */}
        <div className="relative min-h-0 flex-1">
          <div ref={box} dir="ltr" className="h-[58vh] overflow-auto overscroll-contain bg-[#efe2cc] sm:h-[62vh]" style={{ touchAction: "pan-x pan-y" }}>
            <div className="relative" style={{ width: `${zoom * 100}%`, aspectRatio: `${W} / ${H}` }}>
              <img src={VENUE_MAP.image} alt={en ? "Official map of the 4th Al-Qasab Salt Season" : "خريطة موسم ملح القصب الرابع الرسمية"} className="absolute inset-0 size-full select-none" draggable={false} />
              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full cursor-crosshair" onClick={onMapTap}>
                {route && (
                  <>
                    <polyline points={route.points.map((p) => p.join(",")).join(" ")} fill="none" stroke="#fff" strokeWidth={stroke + 6} strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                    <polyline points={route.points.map((p) => p.join(",")).join(" ")} fill="none" stroke="#1d6fd8" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${stroke * 2.2} ${stroke * 1.4}`} className="venue-route" />
                  </>
                )}
                {/* pins to tap */}
                {VENUE_NODES.filter((n) => n.no || n.id === "E" || n.id === "X").map((n) => (
                  <circle key={n.id} cx={n.x} cy={n.y} r={22} fill="transparent" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setToId(n.id); }}>
                    <title>{label(n)}</title>
                  </circle>
                ))}
                {dest && destNode && (
                  <g transform={`translate(${dest[0]},${dest[1]})`} pointerEvents="none">
                    <circle r={26} fill="none" stroke="#b42318" strokeWidth={5} className="venue-pulse" />
                    <path d="M0 -8 C -14 -30 -24 -40 -24 -54 A24 24 0 1 1 24 -54 C 24 -40 14 -30 0 -8 Z" fill="#b42318" stroke="#fff" strokeWidth={4} />
                    <circle cy={-54} r={9} fill="#fff" />
                  </g>
                )}
                <g transform={`translate(${here.x},${here.y})`} pointerEvents="none">
                  <circle r={30} fill="#1d6fd8" opacity="0.18" className="venue-pulse" />
                  <circle r={13} fill="#1d6fd8" stroke="#fff" strokeWidth={5} />
                  <g transform="translate(0,-28)">
                    <rect x={-62} y={-30} width={124} height={34} rx={17} fill="#1d6fd8" stroke="#fff" strokeWidth={3} />
                    <text y={-7} textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" fontFamily="Alexandria, system-ui, sans-serif">{en ? "You are here" : "أنت هنا"}</text>
                  </g>
                </g>
              </svg>
            </div>
          </div>
          <div className="absolute bottom-3 end-3 flex flex-col gap-1.5" dir="ltr">
            <button type="button" onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))} className="grid size-11 place-items-center rounded-xl bg-white text-[#4a2614] shadow-md ring-1 ring-[#e6d5bd]" aria-label={en ? "Zoom in" : "تكبير"}><Plus className="size-5" /></button>
            <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} className="grid size-11 place-items-center rounded-xl bg-white text-[#4a2614] shadow-md ring-1 ring-[#e6d5bd]" aria-label={en ? "Zoom out" : "تصغير"}><Minus className="size-5" /></button>
          </div>
        </div>

        {/* directions */}
        <div className="max-h-[26vh] overflow-auto border-t border-[#e6d5bd] bg-white/70 px-4 py-3 text-sm leading-7">
          {route && destNode ? (
            <ol className="space-y-1">
              <li><b className="text-[#1d6fd8]">{en ? "You are here:" : "أنت هنا:"}</b> {here.id ? name(here.id) : (en ? `near ${hereNode?.en}` : `قرب ${hereNode?.ar}`)}</li>
              <li>
                {en ? "Walk along the visit path (the brown path on the ground, the blue line on the map)" : "امشِ مع مسار الزيارة (الممر البني على الأرض، والخط الأزرق على الخريطة)"}
                {route.via.length > 0 && (
                  <>
                    {en ? ", passing " : "، وبتمر على: "}
                    {route.via.map((n) => label(n)).join(en ? " → " : " ← ")}
                  </>
                )}
                .
              </li>
              <li><b className="text-[#b42318]">{en ? "You arrive at:" : "توصل:"}</b> {label(destNode)}</li>
            </ol>
          ) : (
            <p className="text-[#7a5a45]">{en ? "Pick where you want to go, and the route shows on the map." : "اختر وين تبي تروح، ويطلع لك الطريق على الخريطة."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Framed thumbnail of the season map: opens the viewer (optionally straight to a place). */
export function VenueMapCard({ language = "ar", to, from, compact }: { language?: Language; to?: string; from?: string; compact?: boolean }) {
  const en = language === "en";
  const t = to ? venueNode(to) : null;
  return (
    <button
      type="button"
      onClick={() => openVenueMap({ to, from })}
      className={`venue-card group block w-full overflow-hidden rounded-2xl bg-[#4a2614] text-start text-[#fbf3e4] ${compact ? "mt-2 max-w-md" : ""}`}
    >
      <div className="relative">
        <img src={VENUE_MAP.thumb} alt="" className="aspect-[1684/1191] w-full object-cover transition group-hover:scale-[1.02]" loading="lazy" />
        <span className="absolute start-2 top-2 rounded-full bg-[#4a2614]/90 px-2.5 py-1 text-[11px] font-bold ring-1 ring-[#d6a84a]">{en ? "Official map · PDF" : "الخريطة الرسمية · PDF"}</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <MapIcon className="size-4 shrink-0 text-[#d6a84a]" />
        <span className="text-sm font-extrabold">
          {t ? (en ? `Show me the way to ${t.en}` : `دلني على ${t.ar}`) : en ? "Salt Season map" : "خريطة الموسم"}
        </span>
        <span className="ms-auto text-xs font-bold text-[#e8d3b4]">{en ? "Open →" : "افتح ←"}</span>
      </div>
    </button>
  );
}
