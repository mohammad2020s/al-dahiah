import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Flag, Navigation } from "lucide-react";

// «سباق ملح القصب» (21 Nov 2026): the three routes from the official race posters, traced by hand on
// satellite imagery (Esri) — close, not survey-exact, so the card says «تقريبي». 1.4 km is a loop
// around the old village; 5 km and 10 km are out-and-back from the same start.

type Route = { id: string; km: string; kmEn: string; start: string; startEn: string; surface: string; surfaceEn: string; path: [number, number][]; loop?: boolean };

const START: [number, number] = [25.299433, 45.5072];
const ROUTES: Route[] = [
  {
    id: "1.4", km: "١٫٤ كم", kmEn: "1.4 km", start: "٤:١٠ العصر", startEn: "4:10 pm",
    surface: "داخل القرية ٢٥٪ · أسفلت ٤٪ · تراب ٣٥٪", surfaceEn: "Village lanes 25% · asphalt 4% · dirt 35%", loop: true,
    path: [
      [25.299427, 45.507213], [25.299786, 45.507535], [25.300271, 45.506784], [25.300756, 45.505979], [25.300368, 45.505067],
      [25.299834, 45.504584], [25.299524, 45.504638], [25.299737, 45.505389], [25.299834, 45.505872], [25.299339, 45.506398],
      [25.298699, 45.50496], [25.298767, 45.504799], [25.297991, 45.505604], [25.297361, 45.506569], [25.298282, 45.507535],
      [25.298913, 45.508018], [25.299398, 45.50791], [25.299427, 45.507213],
    ],
  },
  {
    id: "5", km: "٥ كم", kmEn: "5 km", start: "٤:٠٠ العصر", startEn: "4:00 pm",
    surface: "تراب ٤٥٪ · أسفلت ٥٥٪", surfaceEn: "Dirt 45% · asphalt 55%",
    path: [
      START, [25.300228, 45.507607], [25.301489, 45.511255], [25.302653, 45.513893], [25.303371, 45.514494], [25.303817, 45.515824],
      [25.305505, 45.521446], [25.305078, 45.521661], [25.300966, 45.523377], [25.30140, 45.52672],
    ],
  },
  {
    id: "10", km: "١٠ كم", kmEn: "10 km", start: "٣:٣٠ العصر", startEn: "3:30 pm",
    surface: "أسفلت ٥٠٪ · تراب ٣٨٪ · مملحة القصب ١٢٪", surfaceEn: "Asphalt 50% · dirt 38% · salt pans 12%",
    path: [
      START, [25.297593, 45.507953], [25.296196, 45.509541], [25.296817, 45.511558], [25.295575, 45.512374], [25.295963, 45.514133],
      [25.29414, 45.514734], [25.291579, 45.515592], [25.286457, 45.521643], [25.284323, 45.52306], [25.280015, 45.525034],
      [25.27726, 45.524132], [25.273535, 45.522545], [25.271967, 45.523184], [25.270706, 45.524901], [25.269542, 45.526618],
    ],
  },
];

const dot = (color: string, size = 14) =>
  L.divIcon({ className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>` });

export function RaceRoutes({ en }: { en: boolean }) {
  const [sel, setSel] = useState("10");
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const r = ROUTES.find((x) => x.id === sel)!;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Imagery &copy; Esri",
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    setTimeout(() => m.invalidateSize(), 350);
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    L.polyline(r.path, { color: "#fff", weight: 8, opacity: 0.9 }).addTo(g);
    L.polyline(r.path, { color: "#e4572e", weight: 4 }).addTo(g);
    L.marker(r.path[0], { icon: dot("#1d2b5f", 18) }).bindTooltip(en ? "Start / finish" : "البداية والنهاية").addTo(g);
    if (!r.loop) L.marker(r.path[r.path.length - 1], { icon: dot("#e4572e") }).bindTooltip(en ? "Turnaround point" : "نقطة الرجوع").addTo(g);
    m.fitBounds(L.latLngBounds(r.path), { padding: [24, 24] });
  }, [sel]);

  const nav = `https://www.google.com/maps/dir/?api=1&destination=${START[0]},${START[1]}`;

  return (
    <section className="card-contour heritage-frame mt-4 rounded-[1.6rem] border border-[#e2d5c6] bg-white/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#3f2a22]">
          <Flag className="size-5 text-[#a5492a]" />
          {en ? "Al-Qasab Salt Race: routes" : "مسارات سباق ملح القصب"}
        </h2>
        <div className="flex gap-1.5" role="tablist">
          {ROUTES.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={sel === x.id} onClick={() => setSel(x.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${sel === x.id ? "bg-[#a5492a] text-white" : "bg-[#fbf6ee] text-[#3f2a22] ring-1 ring-[#e2d5c6]"}`}>
              {en ? x.kmEn : x.km}
            </button>
          ))}
        </div>
      </div>
      <div ref={el} className="mt-3 h-72 overflow-hidden rounded-2xl ring-1 ring-[#e2d5c6]" />
      <div className="mt-3 grid gap-1 text-sm text-[#3f2a22]">
        <p><b>{en ? "Start: " : "الانطلاق: "}</b>{en ? r.startEn : r.start}{r.loop ? (en ? " · loop around the old village" : " · لفّة حول القرية التراثية") : (en ? " · out and back" : " · ذهاب ورجوع")}</p>
        <p><b>{en ? "Ground: " : "الأرضية: "}</b>{en ? r.surfaceEn : r.surface}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <a href={nav} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[#a5492a] px-3 py-2 text-xs font-bold text-white">
          <Navigation className="size-4" />
          {en ? "Take me to the start line" : "خذني لخط البداية"}
        </a>
        <span className="text-[11px] text-[#6f5446]">{en ? "Traced from the official race posters; approximate." : "مرسوم من بوسترات السباق الرسمية، والمسار تقريبي."}</span>
      </div>
    </section>
  );
}

/** Shown on race day only (Riyadh time) */
export const raceDay = () => {
  const r = new Date(Date.now() + 3 * 3600_000);
  return r.getUTCFullYear() === 2026 && r.getUTCMonth() === 10 && r.getUTCDate() === 21;
};
