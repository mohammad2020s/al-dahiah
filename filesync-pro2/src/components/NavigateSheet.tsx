import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  RotateCw,
  Flag,
  Car,
  Footprints,
  LocateFixed,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";

// In-site turn-by-turn directions to an Al-Qasab place (instead of sending the visitor to
// Google Maps). Free OpenStreetMap routing (FOSSGIS OSRM, no key), the visitor's live position,
// Arabic/English instructions, automatic re-routing and optional spoken guidance.
// Open it from anywhere with: openNavigation({ lat, lng, name })

export type NavTarget = { lat: number; lng: number; name: string };
const EVENT = "dahiah:navigate";
export function openNavigation(target: NavTarget) {
  window.dispatchEvent(new CustomEvent<NavTarget>(EVENT, { detail: target }));
}

type Mode = "car" | "foot";
type Step = {
  type: string;
  modifier?: string;
  exit?: number;
  name: string;
  distance: number; // m, from this manoeuvre to the next
  location: [number, number]; // lat, lng of the manoeuvre
};
type Route = { line: [number, number][]; steps: Step[]; distance: number; duration: number };

const BRAND = "#94532d";
const ROUTER = (mode: Mode) =>
  `https://routing.openstreetmap.de/routed-${mode}/route/v1/${mode === "car" ? "driving" : "foot"}`;

function metersBetween(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fmtDistance(m: number, en: boolean) {
  if (m < 1000) {
    const v = Math.max(10, Math.round(m / 10) * 10);
    return en ? `${v} m` : `${v.toLocaleString("ar-SA")} متر`;
  }
  const km = (m / 1000).toFixed(m < 10000 ? 1 : 0);
  return en ? `${km} km` : `${Number(km).toLocaleString("ar-SA")} كم`;
}
function fmtDuration(s: number, en: boolean) {
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return en ? `${min} min` : `${min.toLocaleString("ar-SA")} دقيقة`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return en ? `${h} h ${m} min` : `${h.toLocaleString("ar-SA")} س ${m.toLocaleString("ar-SA")} د`;
}

const DIR_AR: Record<string, string> = {
  left: "يسار",
  right: "يمين",
  "slight left": "يسار خفيف",
  "slight right": "يمين خفيف",
  "sharp left": "يسار حاد",
  "sharp right": "يمين حاد",
  straight: "على طول",
  uturn: "ارجع لفّة يو",
};

function instruction(step: Step, en: boolean): string {
  const dir = step.modifier || "straight";
  const on = step.name ? (en ? ` onto ${step.name}` : ` على ${step.name}`) : "";
  switch (step.type) {
    case "depart":
      return en ? `Head off${on}` : `انطلق${on}`;
    case "arrive":
      return en ? "You have arrived" : "وصلت لوجهتك";
    case "roundabout":
    case "rotary":
    case "roundabout turn":
      return step.exit
        ? en
          ? `At the roundabout, take exit ${step.exit}${on}`
          : `ادخل الدوّار واطلع من المخرج ${step.exit.toLocaleString("ar-SA")}${on}`
        : en
          ? `Go through the roundabout${on}`
          : `ادخل الدوّار${on}`;
    case "exit roundabout":
    case "exit rotary":
      return en ? `Exit the roundabout${on}` : `اطلع من الدوّار${on}`;
    case "continue":
    case "new name":
      return dir === "straight" ? (en ? `Continue straight${on}` : `كمّل على طول${on}`) : en ? `Keep ${dir}${on}` : `خلّك ${DIR_AR[dir] || ""}${on}`;
    case "merge":
      return en ? `Merge ${dir}${on}` : `ادخل ${DIR_AR[dir] || ""}${on}`;
    case "fork":
      return en ? `Keep ${dir} at the fork${on}` : `عند التفرّع خلّك ${DIR_AR[dir] || ""}${on}`;
    default:
      if (dir === "straight") return en ? `Continue straight${on}` : `كمّل على طول${on}`;
      if (dir === "uturn") return en ? `Make a U-turn${on}` : `ارجع لفّة يو${on}`;
      return en ? `Turn ${dir}${on}` : `لف ${DIR_AR[dir] || ""}${on}`;
  }
}

function StepIcon({ step, className }: { step?: Step; className?: string }) {
  if (!step) return <ArrowUp className={className} />;
  if (step.type === "arrive") return <Flag className={className} />;
  if (/roundabout|rotary/.test(step.type)) return <RotateCw className={className} />;
  const m = step.modifier || "";
  if (m === "left" || m === "sharp left") return <CornerUpLeft className={className} />;
  if (m === "right" || m === "sharp right") return <CornerUpRight className={className} />;
  if (m === "slight left") return <ArrowUpLeft className={className} />;
  if (m === "slight right") return <ArrowUpRight className={className} />;
  return <ArrowUp className={className} />;
}

async function fetchRoute(from: [number, number], to: [number, number], mode: Mode): Promise<Route> {
  const url = `${ROUTER(mode)}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`routing ${res.status}`);
  const data = await res.json();
  const r = data?.routes?.[0];
  if (!r) throw new Error("no route");
  const steps: Step[] = (r.legs?.[0]?.steps || []).map((s: any) => ({
    type: s.maneuver?.type || "",
    modifier: s.maneuver?.modifier,
    exit: s.maneuver?.exit,
    name: s.name || "",
    distance: s.distance || 0,
    location: [s.maneuver.location[1], s.maneuver.location[0]] as [number, number],
  }));
  return {
    line: r.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
    steps,
    distance: r.distance,
    duration: r.duration,
  };
}

export function NavigateSheet({ language = "ar" }: { language?: "ar" | "en" }) {
  const en = language === "en";
  const [target, setTarget] = useState<NavTarget | null>(null);
  const [mode, setMode] = useState<Mode>("car");
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [follow, setFollow] = useState(true);
  const [voice, setVoice] = useState(true);

  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{ route?: L.Polyline; me?: L.CircleMarker; meHalo?: L.Circle; dest?: L.Marker }>({});
  const lastFetchRef = useRef<{ at: number; from: [number, number] } | null>(null);
  const modeChosenRef = useRef(false);
  const spokenRef = useRef<string>("");

  // Open requests from anywhere on the page
  useEffect(() => {
    const onOpen = (e: Event) => {
      const t = (e as CustomEvent<NavTarget>).detail;
      if (!t) return;
      setTarget(t);
      setRoute(null);
      setPos(null);
      setStepIdx(0);
      setError("");
      setFollow(true);
      modeChosenRef.current = false;
      lastFetchRef.current = null;
      spokenRef.current = "";
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  const close = useCallback(() => {
    setTarget(null);
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }, []);

  // Live position
  useEffect(() => {
    if (!target) return;
    if (!navigator.geolocation) {
      setError(en ? "Location isn't available on this device." : "جهازك ما يدعم تحديد الموقع.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      (err) =>
        setError(
          err.code === 1
            ? en
              ? "Allow location access so I can guide you there."
              : "اسمح للموقع بمعرفة مكانك عشان أوجّهك."
            : en
              ? "Couldn't find your location yet."
              : "ما قدرت أحدد مكانك للحين."
        ),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [target, en]);

  // Map
  useEffect(() => {
    if (!target || !elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map);
    map.setView([target.lat, target.lng], 16);
    layersRef.current.dest = L.marker([target.lat, target.lng], {
      icon: L.divIcon({ className: "", html: '<div class="lm-pin lm-pin-active"><span></span></div>', iconSize: [30, 30], iconAnchor: [15, 30] }),
    })
      .addTo(map)
      .bindTooltip(target.name, { direction: "top", offset: [0, -28] });
    map.on("dragstart", () => setFollow(false));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 300);
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = {};
    };
  }, [target]);

  // Walking for short trips, driving otherwise (until the visitor picks)
  useEffect(() => {
    if (!pos || !target || modeChosenRef.current) return;
    modeChosenRef.current = true;
    setMode(metersBetween(pos, [target.lat, target.lng]) < 1500 ? "foot" : "car");
  }, [pos, target]);

  // (Re)route: first fix, mode change, or wandering off the line
  const offRoute = useMemo(() => {
    if (!pos || !route) return false;
    let best = Infinity;
    for (let i = 0; i < route.line.length; i += Math.max(1, Math.floor(route.line.length / 400))) {
      best = Math.min(best, metersBetween(pos, route.line[i]));
    }
    return best > 60;
  }, [pos, route]);

  useEffect(() => {
    if (!pos || !target || !modeChosenRef.current) return;
    const last = lastFetchRef.current;
    const need = !route || (offRoute && (!last || Date.now() - last.at > 15000));
    if (!need || loading) return;
    lastFetchRef.current = { at: Date.now(), from: pos };
    setLoading(true);
    fetchRoute(pos, [target.lat, target.lng], mode)
      .then((r) => {
        setRoute(r);
        setStepIdx(0);
        setError("");
      })
      .catch(() => setError(en ? "Couldn't get directions right now." : "ما قدرت أجيب الطريق الحين، جرّب بعد شوي."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, target, mode, offRoute]);

  // Mode switch → fresh route
  const switchMode = (m: Mode) => {
    if (m === mode) return;
    modeChosenRef.current = true;
    setMode(m);
    setRoute(null);
    lastFetchRef.current = null;
  };

  // Advance through the steps as the visitor reaches each turn
  useEffect(() => {
    if (!pos || !route) return;
    let i = stepIdx;
    while (i + 1 < route.steps.length && metersBetween(pos, route.steps[i + 1].location) < 25) i++;
    if (i !== stepIdx) setStepIdx(i);
  }, [pos, route, stepIdx]);

  const next = route?.steps[Math.min(stepIdx + 1, (route?.steps.length || 1) - 1)];
  const toNext = pos && next ? metersBetween(pos, next.location) : 0;
  const remaining = useMemo(() => {
    if (!route || !pos) return null;
    const rest = route.steps.slice(stepIdx + 1).reduce((a, s) => a + s.distance, 0) + toNext;
    const ratio = route.distance > 0 ? rest / route.distance : 0;
    return { distance: rest, duration: route.duration * ratio };
  }, [route, pos, stepIdx, toNext]);
  const arrived = !!pos && !!target && metersBetween(pos, [target.lat, target.lng]) < 30;

  // Draw route and position
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ly = layersRef.current;
    if (route) {
      if (ly.route) ly.route.setLatLngs(route.line);
      else ly.route = L.polyline(route.line, { color: BRAND, weight: 6, opacity: 0.85 }).addTo(map);
    }
    if (pos) {
      if (ly.me) ly.me.setLatLng(pos);
      else ly.me = L.circleMarker(pos, { radius: 8, color: "#fff", weight: 3, fillColor: "#2563a8", fillOpacity: 1 }).addTo(map);
      if (ly.meHalo) ly.meHalo.setLatLng(pos);
      else ly.meHalo = L.circle(pos, { radius: 25, color: "#2563a8", weight: 0, fillOpacity: 0.12 }).addTo(map);
    }
  }, [route, pos]);

  // Frame the trip once, then follow the visitor
  const framedRef = useRef(false);
  useEffect(() => {
    framedRef.current = false;
  }, [target, mode]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pos) return;
    if (route && !framedRef.current) {
      framedRef.current = true;
      map.fitBounds(L.latLngBounds([...route.line, pos]), { padding: [60, 60], maxZoom: 17 });
      return;
    }
    if (follow && framedRef.current) map.panTo(pos, { animate: true });
  }, [pos, route, follow]);

  // Spoken guidance (browser voice), once per instruction
  useEffect(() => {
    if (!voice || !route || !next) return;
    const text = arrived ? instruction({ type: "arrive", name: "", distance: 0, location: [0, 0] }, en) : instruction(next, en);
    const key = `${stepIdx}|${arrived}`;
    if (spokenRef.current === key) return;
    spokenRef.current = key;
    try {
      const u = new SpeechSynthesisUtterance(arrived ? text : `${en ? "In" : "بعد"} ${fmtDistance(toNext, en)}، ${text}`);
      u.lang = en ? "en-US" : "ar-SA";
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(u);
    } catch {
      /* no speech on this browser */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, route, stepIdx, arrived]);

  if (!target) return null;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=${mode === "car" ? "driving" : "walking"}`;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#21160e]" dir={en ? "ltr" : "rtl"}>
      {/* Next instruction */}
      <div className="relative z-[2] flex items-center gap-3 bg-[#6c3a1c] px-4 py-3 text-white shadow-lg">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">
          {arrived ? <Flag className="size-7" /> : <StepIcon step={next} className="size-7" />}
        </div>
        <div className="min-w-0 flex-1">
          {arrived ? (
            <p className="text-lg font-bold">{en ? "You have arrived 🎉" : "وصلت بالسلامة 🎉"}</p>
          ) : route && next ? (
            <>
              <p className="text-xl font-bold leading-tight">{fmtDistance(toNext, en)}</p>
              <p className="truncate text-sm text-white/90">{instruction(next, en)}</p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {error || (pos ? (en ? "Finding the way…" : "أجهّز لك الطريق…") : en ? "Finding your location…" : "أحدد مكانك…")}
            </p>
          )}
          <p className="truncate text-[11px] text-white/70">
            {en ? "To: " : "إلى: "}
            {target.name}
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
          aria-label={en ? "Close directions" : "إغلاق التوجيه"}
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <div ref={elRef} className="absolute inset-0" />
        <div className="absolute bottom-3 end-3 z-[500] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setFollow(true);
              if (pos) mapRef.current?.setView(pos, 17);
            }}
            className={`grid size-11 place-items-center rounded-full shadow-lg ${follow ? "bg-[#94532d] text-white" : "bg-white text-[#94532d]"}`}
            aria-label={en ? "Follow me" : "تابع مكاني"}
          >
            <LocateFixed className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setVoice((v) => !v)}
            className="grid size-11 place-items-center rounded-full bg-white text-[#94532d] shadow-lg"
            aria-label={voice ? (en ? "Mute" : "كتم الصوت") : en ? "Voice guidance" : "التوجيه الصوتي"}
          >
            {voice ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
        </div>
        {error && route && (
          <div className="absolute inset-x-3 top-3 z-[500] rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-[#6c3a1c] shadow">{error}</div>
        )}
      </div>

      {/* Trip summary */}
      <div className="relative z-[2] space-y-3 bg-[#fbf5ec] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-[#3a2a1c]">{remaining ? fmtDuration(remaining.duration, en) : "—"}</p>
            <p className="text-xs text-[#786450]">{remaining ? fmtDistance(remaining.distance, en) : en ? "Distance…" : "المسافة…"}</p>
          </div>
          <div className="flex rounded-xl border border-[#e6d5bd] bg-white p-1">
            {(["car", "foot"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  mode === m ? "bg-[#94532d] text-white" : "text-[#6c3a1c]"
                }`}
              >
                {m === "car" ? <Car className="size-4" /> : <Footprints className="size-4" />}
                {m === "car" ? (en ? "Drive" : "سيارة") : en ? "Walk" : "مشي"}
              </button>
            ))}
          </div>
        </div>
        {route && route.steps.length > 1 && (
          <div className="max-h-28 space-y-1 overflow-y-auto rounded-xl border border-[#e6d5bd] bg-white p-2">
            {route.steps.slice(stepIdx + 1).map((s, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs ${i === 0 ? "font-bold text-[#3a2a1c]" : "text-[#584535]"}`}>
                <StepIcon step={s} className="size-4 shrink-0 text-[#94532d]" />
                <span className="min-w-0 flex-1 truncate">{instruction(s, en)}</span>
                <span className="shrink-0 text-[10px] text-[#786450]">{fmtDistance(s.distance, en)}</span>
              </div>
            ))}
          </div>
        )}
        <a href={google} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 text-[11px] text-[#786450] underline">
          <ExternalLink className="size-3" />
          {en ? "Open in Google Maps instead" : "أو افتحها في خرائط Google"}
        </a>
      </div>
    </div>
  );
}
