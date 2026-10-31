import React, { FormEvent, KeyboardEvent, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  CloudSun,
  Coffee,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  MapPinned,
  Mic,
  Phone,
  Plus,
  SendHorizontal,
  Sparkles,
  Square,
  Star,
  Timer,
  Volume2,
  BadgeCheck,
  ArrowUpLeft,
  Camera,
  X,
  CornerDownLeft,
  Ticket,
  Navigation,
  Moon,
  Sun,
  LocateFixed,
  ChevronDown,
  Landmark,
  ScrollText,
} from "lucide-react";
import { MalhAlQasabLogo, TanmiahLogo } from "../components/BrandLogos";
import { RichText } from "../components/RichText";
import { NavigateSheet, openNavigation } from "../components/NavigateSheet";
// The call screen pulls in three.js and the salt bag; load it only when someone calls
import { preloadGrandpa } from "../components/grandpaFrames";
// Fetch the call screen and the grandfather's paintings together
const loadVoiceCall = () => {
  preloadGrandpa();
  return import("../components/VoiceCall");
};
const VoiceCall = lazy(() => loadVoiceCall().then((m) => ({ default: m.VoiceCall })));
import { CallButtonAnimation } from "../components/CallButtonAnimation";
import { LanguageModal } from "../components/LanguageModal";
import { LeafletMap, directionsUrl, type MapPoint } from "../components/LeafletMap";
import { AL_QASAB_CAFES, AL_QASAB_LANDMARKS } from "../../server/alQasabScope.ts";
import { PLACE_TOPICS } from "../../server/alQasabKnowledge.ts";
import { TourRoute } from "../components/TourRoute";
import { PlaceGallery, type PlaceImage } from "../components/PlaceGallery";
import { SeasonCountdown } from "../components/SeasonCountdown";
import { BackgroundSlideshow, SLIDES } from "../components/BackgroundSlideshow";
import { PrayerTimes, prayerTimes } from "../components/PrayerTimes";
import { NearMe, openNearMe } from "../components/NearMe";
import { WelcomeGrandpa } from "../components/WelcomeGrandpa";
import { MobileBar, FloatingCall } from "../components/MobileBar";
import { DidYouKnow } from "../components/DidYouKnow";
import { SaltPassport } from "../components/SaltPassport";
import { Language, translations } from "../i18n";

type WeatherData = {
  source: "google" | "fallback";
  temperature: number;
  feelsLike: number;
  conditionText: string;
  conditionType: string;
  humidity: number;
  windSpeed: number;
  maxTemperature?: number;
  minTemperature?: number;
  precipitationPercent?: number;
  uvIndex?: number;
  summaryText?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  guarded?: boolean;
  showMap?: boolean;
  locationData?: any;
  weather?: WeatherData | null;
  images?: PlaceImage[];
  mapsUrl?: string;
  ticketUrl?: string;
  link?: { url: string; label: string };
  audio?: string;
  /** Next questions to tap under an answer */
  followUps?: string[];
  /** «صوّر واسأل»: the visitor's photo (small preview data URL) */
  photo?: string;
};

type PendingPhoto = { preview: string; data: string; mimeType: string };

/** Shrinks a camera photo to ≤1024 px JPEG so it uploads fast on mobile data. */
function shrinkPhoto(file: File): Promise<PendingPhoto> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 1024;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      resolve({ preview: dataUrl, data: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

function WeatherCard({ weather, language = "ar" }: { weather: WeatherData; language?: Language }) {
  const t = translations[language];

  return (
    <div className="mt-3 overflow-hidden rounded-[1.35rem] border border-[#e5d2b8] bg-gradient-to-br from-white to-[#fbf5ec] p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ede1cd] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#94532d] text-white shadow-sm shadow-stone-900/10">
            <CloudSun className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#3a2a1c]">{t.weatherCardTitle}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#94532d]/10 px-2 py-0.5 text-[11px] font-semibold text-[#94532d]">
                <span className="size-1.5 rounded-full bg-[#94532d] animate-pulse" />
                {weather.source === "fallback" ? t.weatherFallbackBadge : t.weatherLiveBadge}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#786450]">
              {weather.source === "fallback" ? t.weatherFallbackAttribution : t.weatherGoogleAttribution}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-1 text-right">
          <span className="font-display-ar text-2xl font-bold text-[#844826] sm:text-3xl">{weather.temperature}°</span>
          <span className="text-xs font-semibold text-[#6c3a1c]">{t.celsius}</span>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[#ede0cb] bg-white p-2.5 text-center shadow-xs">
          <p className="text-[11px] font-medium text-[#786450]">{t.weatherCondition}</p>
          <p className="mt-1 text-xs font-bold text-[#2e2218]">{weather.conditionText}</p>
        </div>
        <div className="rounded-xl border border-[#ede0cb] bg-white p-2.5 text-center shadow-xs">
          <p className="text-[11px] font-medium text-[#786450]">{t.weatherFeelsLike}</p>
          <p className="mt-1 text-xs font-bold text-[#2e2218]">{weather.feelsLike}° {t.celsius}</p>
        </div>
        <div className="rounded-xl border border-[#ede0cb] bg-white p-2.5 text-center shadow-xs">
          <p className="text-[11px] font-medium text-[#786450]">{t.weatherHumidity}</p>
          <p className="mt-1 text-xs font-bold text-[#2e2218]">{weather.humidity}%</p>
        </div>
        <div className="rounded-xl border border-[#ede0cb] bg-white p-2.5 text-center shadow-xs">
          <p className="text-[11px] font-medium text-[#786450]">{t.weatherWindSpeed}</p>
          <p className="mt-1 text-xs font-bold text-[#2e2218]">{weather.windSpeed} {t.weatherKmH}</p>
        </div>
      </div>
    </div>
  );
}

// Every Al-Qasab place gets a pin on the location map; tap a pin to see its name
const ALL_MAP_POINTS: MapPoint[] = [
  ...AL_QASAB_LANDMARKS.filter((l) => l.id !== "cafes").map((l) => ({
    id: l.id,
    lat: l.coordinates.lat,
    lng: l.coordinates.lng,
    title: l.name,
    kind: l.id === "salt_flat" || l.id === "sabkha" ? ("nature" as const) : undefined,
  })),
  // Only places in and around town: far ones (Burdan lake, the Nafud, Al-Shafei…) get their own map
  ...PLACE_TOPICS.filter(
    (t) =>
      t.coordinates &&
      !AL_QASAB_LANDMARKS.some((l) => l.id === t.id) &&
      Math.abs(t.coordinates.lat - 25.2987) < 0.03 &&
      Math.abs(t.coordinates.lng - 45.505) < 0.05
  ).map((t) => ({
    id: t.id,
    lat: t.coordinates!.lat,
    lng: t.coordinates!.lng,
    title: t.titleAr,
    // Salt pans / sabkha are nature (amber); souq and houses are heritage (red)
    kind: t.id === "muqhim_pan" || t.id === "sabkha" ? ("nature" as const) : undefined,
  })),
  ...AL_QASAB_CAFES.map((c, i) => ({
    id: c.id,
    lat: c.coordinates.lat,
    lng: c.coordinates.lng,
    title: c.name,
    label: String(i + 1),
    kind: "cafe" as const,
  })),
];
const CAFE_PIN_IDS = AL_QASAB_CAFES.map((c) => c.id);

function LocationMapCard({ location, language = "ar" }: { location: any; language?: Language }) {
  const isCafes = location.type === "cafes" || Boolean(location.places && location.places.length > 0);
  const activeCoordinates = location.coordinates || { lat: 25.2984, lng: 45.5073 };
  // «الأماكن السياحية على الخريطة»: every pin, none highlighted, framed together
  const allPlaces = location.type === "all";
  const locationTitle = allPlaces
    ? language === "en" ? "Al-Qasab places on the map" : "أماكن القصب على الخريطة"
    : location.name || (language === "en" ? "Al-Qasab Salt Season - Event Grounds" : "موسم ملح القصب - أرض الفعاليات");
  // Several cafes → frame the 4 cafes; otherwise focus the place being asked about
  const multiPin = isCafes && Array.isArray(location.places) && location.places.length > 1;
  const servicePins: { id: string; name: string; nameEn?: string; lat: number; lng: number; kind: "mosque" | "wc" }[] | null =
    Array.isArray(location.pins) ? location.pins : null;
  const { mapPoints, activeId } = useMemo(() => {
    if (servicePins) {
      return {
        mapPoints: servicePins.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, title: language === "en" && p.nameEn ? p.nameEn : p.name, kind: p.kind })),
        activeId: undefined,
      };
    }
    const points: MapPoint[] = [...ALL_MAP_POINTS];
    if (multiPin || allPlaces) return { mapPoints: points, activeId: undefined };
    const byId = location.id && points.find((p) => p.id === location.id);
    const near = byId || points.find((p) => Math.abs(p.lat - activeCoordinates.lat) < 0.0004 && Math.abs(p.lng - activeCoordinates.lng) < 0.0004);
    if (near) return { mapPoints: points, activeId: near.id };
    points.push({ id: "here", lat: activeCoordinates.lat, lng: activeCoordinates.lng, title: locationTitle });
    return { mapPoints: points, activeId: "here" };
  }, [servicePins, language, multiPin, allPlaces, location, activeCoordinates.lat, activeCoordinates.lng, locationTitle]);

  return (
    <div className="my-4 overflow-hidden rounded-3xl border border-[#e5d2b8] bg-white shadow-lg shadow-gray-200/50 w-full">
      <LeafletMap
        className="h-64 sm:h-72"
        points={mapPoints}
        activeId={activeId}
        fitIds={servicePins ? servicePins.map((p) => p.id) : multiPin ? CAFE_PIN_IDS : undefined}
        zoom={17}
      />
      <div className="flex items-center justify-between gap-2 border-t border-[#ebdfcc] px-3 py-2.5">
        <span className="min-w-0 truncate text-xs font-bold text-[#33251a]">
          {servicePins ? (language === "en" && location.nameEn ? location.nameEn : location.name) : locationTitle}
        </span>
        {allPlaces || servicePins ? (
          <span className="shrink-0 text-[11px] text-[#786450]">{language === "en" ? "Tap a pin to see its name" : "اضغط على أي دبوس يطلع اسمه"}</span>
        ) : (
        <button
          type="button"
          onClick={() => openNavigation({ lat: activeCoordinates.lat, lng: activeCoordinates.lng, name: locationTitle })}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#94532d] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#78411f]"
        >
          <Navigation className="size-3.5" />
          {language === "en" ? "Take me there" : "خذني لها"}
        </button>
        )}
      </div>

      {servicePins && (
        <div className="border-t border-[#ebdfcc] bg-[#fcf8f1] p-3 sm:p-4 space-y-1.5">
          {servicePins.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#e7d8c2] bg-white px-2.5 py-2">
              <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#33251a]">
                <span className={`size-2.5 shrink-0 rounded-full ${p.kind === "wc" ? "bg-[#2563a8]" : "bg-[#2f7d4f]"}`} />
                <span className="truncate">{language === "en" && p.nameEn ? p.nameEn : p.name}</span>
              </span>
              <button
                type="button"
                onClick={() => openNavigation({ lat: p.lat, lng: p.lng, name: language === "en" && p.nameEn ? p.nameEn : p.name })}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#94532d] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#78411f]"
              >
                <Navigation className="size-3" />
                {language === "en" ? "Take me there" : "خذني له"}
              </button>
            </div>
          ))}
        </div>
      )}

      {isCafes && location.places && (
        <div className="border-t border-[#ebdfcc] bg-[#fcf8f1] p-3 sm:p-4">
          <div className="space-y-2">
            {location.places.map((place: any) => (
              <div
                key={place.id}
                className="rounded-xl border border-[#e7d8c2] bg-white p-2.5 transition hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#33251a]">{place.name}</span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                        <Star className="size-2.5 fill-amber-500 text-amber-500" />
                        {place.rating} / 5
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#584535]">{place.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      place.coordinates
                        ? openNavigation({ lat: place.coordinates.lat, lng: place.coordinates.lng, name: place.name })
                        : window.open(place.directionsUrl, "_blank", "noopener")
                    }
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#94532d] px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-[#78411f]"
                  >
                    <Navigation className="size-3" />
                    <span>{language === "en" ? "Take me there" : "خذني له"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, language = "ar" }: { message: ChatMessage; language?: Language }) {
  const t = translations[language];
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleCopy = () => {
    navigator.clipboard?.writeText(message.content.replace(/\*\*/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (message.audio) {
      playBase64Audio(message.audio);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content.replace(/\*\*|^\s*[*-]\s+/gm, "") }),
      });
      const data = await res.json();
      setIsLoadingAudio(false);
      if (data.audio) {
        playBase64Audio(data.audio);
      }
    } catch {
      setIsLoadingAudio(false);
    }
  };

  const playBase64Audio = (base64Audio: string) => {
    const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
    } else {
      audioRef.current.src = audioUrl;
    }
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.play().catch(() => setIsPlaying(false));
    setIsPlaying(true);
  };

  return (
    <div className={`flex flex-col ${isUser ? "items-start" : "items-start w-full"}`}>
      {isUser ? (
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#94532d] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-stone-950/10">
          {message.photo && (
            <img
              src={message.photo}
              alt={language === "en" ? "Your photo" : "صورتك"}
              className="mb-2 max-h-56 w-auto max-w-full rounded-xl border-2 border-white/30 object-cover"
            />
          )}
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      ) : (
        <div className="w-full space-y-2.5">
          <div className="flex items-center justify-between pr-0.5">
            <div className="flex items-center gap-2">
              <MalhAlQasabLogo size="sm" className="rounded-xl" />
              <span className="text-xs font-bold text-[#3a2a1c]">{t.appName}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {message.content && (
                <>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-full border border-[#e5d2b8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6c3a1c] shadow-xs transition hover:bg-[#f8efe2]"
                  >
                    {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-[#94532d]" />}
                    <span>{copied ? "تم النسخ" : "نسخ"}</span>
                  </button>

                  <button
                    onClick={handleToggleSpeak}
                    disabled={isLoadingAudio}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border border-[#e5d2b8] bg-white text-[#6c3a1c] hover:bg-[#f8efe2] shadow-xs"
                  >
                    {isLoadingAudio ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : isPlaying ? (
                      <>
                        <Square className="size-3 fill-current" />
                        <span>{t.stopAudio}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="size-3.5 text-[#94532d]" />
                        <span>{t.listenAudio}</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            className={`rounded-[1.4rem] border px-5 py-4 text-sm leading-7 shadow-sm sm:px-6 sm:py-5 ${
              message.guarded
                ? "border-[#e8d5bb] bg-[#fcf7ef] text-[#6d2520]"
                : "border-[#e6d5bd] bg-white text-[#241515]"
            }`}
          >
            {message.content ? (
              <RichText text={message.content} />
            ) : (
              <div className="flex items-center gap-2 py-1 text-xs text-[#786450]">
                <Loader2 className="size-4 animate-spin text-[#94532d]" />
                <span>{t.thinking}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Night look after Maghrib until sunrise in Al-Qasab (the season runs 4–11 pm), unless the
// visitor picked day or night themselves
function isNightInQasab() {
  const now = new Date(Date.now() + 3 * 3600_000);
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const t = prayerTimes(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
  return h >= t.maghrib || h < t.sunrise;
}
type ThemePick = "auto" | "day" | "night";
function readTheme(): ThemePick {
  try {
    const v = localStorage.getItem("dahiah:theme");
    return v === "day" || v === "night" ? v : "auto";
  } catch {
    return "auto";
  }
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("ar");
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isCallAnimating, setIsCallAnimating] = useState(false);
  const [callOriginRect, setCallOriginRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const callButtonRef = useRef<HTMLButtonElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [photoError, setPhotoError] = useState("");
  // Phones: the long placeholder (which also mentions the hidden mic) doesn't fit the input
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsNarrow(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [themePick, setThemePick] = useState<ThemePick>(readTheme);
  const [autoNight, setAutoNight] = useState(isNightInQasab);
  useEffect(() => {
    const id = setInterval(() => setAutoNight(isNightInQasab()), 60_000);
    return () => clearInterval(id);
  }, []);
  const night = themePick === "night" || (themePick === "auto" && autoNight);
  const toggleTheme = () => {
    const next: ThemePick = night ? "day" : "night";
    // Going back to what the clock says means "auto" again
    const pick: ThemePick = next === (autoNight ? "night" : "day") ? "auto" : next;
    setThemePick(pick);
    try {
      localStorage.setItem("dahiah:theme", pick);
    } catch {}
  };
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", night ? "#1f1610" : "#94532d");
  }, [night]);
  const goToChat = () => {
    document.getElementById("chat-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 450);
  };
  const goToSeason = () => {
    setMoreOpen(true);
    setTimeout(() => document.getElementById("season-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const t = translations[language];

  const handleStartCall = () => {
    // Start fetching the call screen while the button animation plays
    loadVoiceCall();
    if (isCallAnimating || isVoiceCallOpen) return;
    if (callButtonRef.current) {
      const rect = callButtonRef.current.getBoundingClientRect();
      setCallOriginRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    setIsCallAnimating(true);
    setTimeout(() => {
      setIsCallAnimating(false);
      setIsVoiceCallOpen(true);
    }, 1100);
  };

  useEffect(() => {
    fetch("/api/weather")
      .then(r => r.json())
      .then(d => setWeatherData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // same photo can be picked again
    if (!file) return;
    setPhotoError("");
    try {
      setPendingPhoto(await shrinkPhoto(file));
      textareaRef.current?.focus();
    } catch {
      setPhotoError(language === "en" ? "Couldn't open that photo, try another one." : "ما قدرت أفتح الصورة، جرّب صورة ثانية.");
    }
  };

  const askQuestion = async (question: string, withPhoto: PendingPhoto | null = null) => {
    const photo = withPhoto;
    const text = question.trim() || (photo ? (language === "en" ? "What is this place?" : "وش هذا المكان؟") : "");
    if (!text || isStreaming) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      ...(photo ? { photo: photo.preview } : {}),
    };

    const assistantId = `a-${Date.now() + 1}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setPendingPhoto(null);
    setIsStreaming(true);

    let accumulated = "";

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          // Text only: earlier photos are not sent again
          history: messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
          language,
          ...(photo ? { image: { mimeType: photo.mimeType, data: photo.data } } : {}),
        }),
        signal: abortController.signal,
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: body.error || t.errorResponse } : m));
        return;
      }
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          try {
            const data = JSON.parse(trimmed.replace(/^data:\s*/, ""));
            if (data.type === "chunk" && data.content) {
              accumulated += data.content;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
              );
            } else if (data.type === "done") {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: data.answer || accumulated,
                        guarded: data.guarded,
                        showMap: data.showMap,
                        locationData: data.locationData,
                        weather: data.weather,
                        images: Array.isArray(data.images) ? data.images : undefined,
                        mapsUrl: typeof data.mapsUrl === "string" ? data.mapsUrl : undefined,
                        ticketUrl: typeof data.ticketUrl === "string" ? data.ticketUrl : undefined,
                        link: data.link && typeof data.link.url === "string" ? data.link : undefined,
                        followUps: Array.isArray(data.followUps) ? data.followUps.slice(0, 3) : undefined,
                      }
                    : m
                )
              );
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: t.errorResponse } : m)
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    askQuestion(input, pendingPhoto);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion(input, pendingPhoto);
    }
  };

  const lastAssistantId = [...messages].reverse().find(m => m.role === "assistant")?.id;

  return (
    <main
      dir={language === "ar" ? "rtl" : "ltr"}
      className={`soft-grid relative min-h-screen overflow-hidden bg-[#f8f2e9] text-[#2e2218] ${night ? "night" : ""}`}
    >
      <LanguageModal
        isOpen={isLanguageModalOpen}
        onSelectLanguage={(l) => {
          setLanguage(l);
          setIsLanguageModalOpen(false);
        }}
        currentLanguage={language}
      />

      <CallButtonAnimation
        isAnimating={isCallAnimating}
        originRect={callOriginRect}
      />

      {/* In-site turn-by-turn directions, opened by every «خذني لها» button */}
      <NavigateSheet language={language} />
      <NearMe language={language} />
      <WelcomeGrandpa language={language} onCall={handleStartCall} />
      <MobileBar language={language} onChat={goToChat} onCall={handleStartCall} onMore={goToSeason} />
      <FloatingCall language={language} onCall={handleStartCall} />

      {isVoiceCallOpen && (
        <Suspense fallback={null}>
          <VoiceCall
            isOpen={isVoiceCallOpen}
            onClose={() => setIsVoiceCallOpen(false)}
            language={language}
          />
        </Suspense>
      )}

      {/* Photos of Al-Qasab drifting behind the page */}
      <BackgroundSlideshow language={language} onAsk={(q) => askQuestion(q)} onChange={setSlideIdx} />

      <div className="relative z-[1] mx-auto flex min-h-screen max-w-[1480px] flex-col px-4 pt-4 pb-28 sm:px-6 lg:px-8 lg:pb-4">
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#e6d5bd] bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            <MalhAlQasabLogo size="md" className="rounded-2xl" />
            <div>
              <h1 className="font-kufi text-xl sm:text-2xl font-bold leading-none text-[#78411f]">
                الداهية
              </h1>
              <p className="mt-1 text-[11px] font-semibold text-[#94532d]">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Sponsor Tag */}
          <div className="flex items-center gap-2.5 rounded-full border border-[#e6d5bd] bg-[#fdfaf5] px-4 py-1.5 shadow-xs">
            <div className="text-right leading-tight">
              <p className="text-[11px] font-medium text-[#a8744a]">{t.sponsoredBy}</p>
              <p className="mt-0.5 text-[11px] font-bold text-[#5c331b]">
                {t.sponsorName}
              </p>
            </div>
            <div className="grid size-8 place-items-center rounded-full bg-white border border-[#e6d5bd] p-0.5">
              <TanmiahLogo size="sm" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#e6d5bd] bg-[#fbf6ee] px-3 py-1.5 text-xs font-semibold text-[#844826]">
              <span className="size-2 rounded-full bg-[#94532d] animate-pulse" />
              <span>{t.onlineStatus}</span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="grid size-8 place-items-center rounded-xl border border-[#e6d5bd] bg-[#fbf6ee] text-[#6c3a1c] shadow-xs hover:bg-[#f5eadb] transition"
              title={night ? (language === "en" ? "Day look" : "الوضع النهاري") : language === "en" ? "Night look" : "الوضع الليلي"}
              aria-label={night ? (language === "en" ? "Day look" : "الوضع النهاري") : language === "en" ? "Night look" : "الوضع الليلي"}
            >
              {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6d5bd] bg-[#fbf6ee] px-3 py-1.5 text-xs font-bold text-[#6c3a1c] shadow-xs hover:bg-[#f5eadb] transition"
            >
              <Globe className="size-3.5 text-[#94532d]" />
              <span>{language === "ar" ? "English / العربية" : "العربية / English"}</span>
            </button>

            <button
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#775c46] hover:bg-[#f5eadb] hover:text-[#6c3a1c] transition"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t.newChat}</span>
            </button>
          </div>
        </header>
        <div className="sadu-strip mx-8 rounded-b-lg opacity-90" aria-hidden="true" />

        {/* Two-column layout */}
        <section className="flex flex-col lg:flex-row gap-5 py-5 flex-1">
          {/* Sidebar */}
          <aside id="season-panel" className="order-2 w-full scroll-mt-4 lg:order-none lg:w-[300px] shrink-0 flex flex-col gap-4">
            {/* Top card (desktop): earthy brown with a Sadu ribbon */}
            <div className="relative hidden overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-[#4a2814] via-[#6c3a1c] to-[#94532d] p-5 pt-6 text-white shadow-lg shadow-stone-950/20 lg:block">
              <div className="sadu-strip absolute inset-x-0 top-0" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
                <Sparkles className="size-3" />
                {t.specialtyBadge}
              </span>
              <h2 className="mt-3 font-kufi text-lg sm:text-xl font-bold leading-snug">
                {t.guideTitle1} <br />
                {t.guideTitle2}
              </h2>
              <p className="mt-2 text-xs leading-6 text-[#f0e1cb]">
                {t.guideDesc}
              </p>
            </div>

            <SeasonCountdown language={language} onAsk={askQuestion} />

            <DidYouKnow language={language} onAsk={(q) => askQuestion(q)} />

            <button
              type="button"
              onClick={openNearMe}
              className="flex items-center gap-3 rounded-[1.7rem] border border-[#e6d5bd] bg-white/95 p-4 text-start shadow-sm backdrop-blur transition hover:border-[#94532d] active:scale-[0.99]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#f3ebdf] text-[#94532d]">
                <LocateFixed className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-kufi block text-sm font-bold text-[#3a2a1c]">{language === "en" ? "Near me now" : "قريب مني الحين"}</span>
                <span className="block text-xs text-[#786450]">{language === "en" ? "Nearest mosque, restroom and café" : "أقرب مسجد ودورة مياه ومقهى"}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="flex items-center justify-between rounded-2xl border border-[#e6d5bd] bg-white/90 px-4 py-3 text-sm font-bold text-[#6c3a1c] shadow-sm lg:hidden"
              aria-expanded={moreOpen}
            >
              {moreOpen
                ? language === "en" ? "Show less" : "أخفِ التفاصيل"
                : language === "en" ? "Tour route, salt passport, prayer times, weather" : "الجولة، جواز الملح، الصلاة، الطقس"}
              <ChevronDown className={`size-4 transition ${moreOpen ? "rotate-180" : ""}`} />
            </button>

            <div className={moreOpen ? "flex flex-col gap-4" : "hidden lg:flex lg:flex-col lg:gap-4"}>
            <TourRoute language={language} onAsk={askQuestion} />

            <SaltPassport language={language} />

            <PrayerTimes language={language} onAsk={(q) => askQuestion(q)} />

            {/* Weather Card */}
            {weatherData && (
              <div className="rounded-[1.7rem] border border-[#e6d5bd] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#faf4ea] border border-[#ede0cb] px-2 py-0.5 text-[11px] font-bold text-[#844826]">
                    Google Weather
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a1c]">
                    <CloudSun className="size-4 text-[#94532d]" />
                    <span>{t.weatherNow}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => askQuestion(language === "en" ? "What is the weather in Al-Qasab now?" : "ما هو طقس القصب الآن؟")}
                    className="rounded-xl border border-[#e6d5bd] bg-[#faf4ea] px-3 py-1.5 text-[11px] font-bold text-[#6c3a1c] hover:bg-[#f5eadb] transition"
                  >
                    {t.askAssistant}
                  </button>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-[#844826]">{weatherData.temperature}°</p>
                    <p className="text-[11px] text-[#786450] text-right">{weatherData.conditionText}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Policy Badge Card */}
            <div className="rounded-[1.4rem] border border-[#e6d5bd] bg-white/85 p-4 text-[11px] leading-5 text-[#685140] flex items-center gap-2">
              <BadgeCheck className="size-4 text-[#94532d] shrink-0" />
              <span>{t.scopeNotice}</span>
            </div>
            </div>
          </aside>

          {/* Main Chat Container */}
          <section id="chat-panel" className="order-1 scroll-mt-3 lg:order-none flex-1 flex min-h-[78vh] lg:min-h-[640px] flex-col overflow-hidden rounded-[1.8rem] border border-[#e6d5bd] bg-white/80 shadow-md backdrop-blur-sm">
            <div className="sadu-strip" aria-hidden="true" />
            {/* Top Bar inside Chat */}
            <div className="flex items-center justify-between border-b border-[#ede1cd] bg-white px-5 py-3.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <Timer className="size-3 text-emerald-600 animate-pulse" />
                <span>{t.sevenSecondBadge}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[#3a2a1c]">{t.chatHeaderTitle}</p>
                <p className="text-[11px] text-[#786450]">{t.chatHeaderSubtitle}</p>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-7">
              {messages.length === 0 ? (
                /* Welcome screen: the photo behind the visitor right now, then questions with icons */
                <div className="mx-auto flex min-h-[400px] max-w-xl flex-col items-center justify-center text-center">
                  <div className="mb-3 rounded-[1.7rem] border border-[#e6d5bd] bg-white p-1 shadow-md">
                    <MalhAlQasabLogo size="lg" />
                  </div>
                  <h2 className="font-kufi text-2xl font-bold text-[#3a2a1c] sm:text-3xl">{t.welcomeTitle}</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#685140]">{t.welcomeDesc}</p>

                  {(() => {
                    const slide = SLIDES[slideIdx] || SLIDES[0];
                    return (
                      <button
                        type="button"
                        key={slide.src}
                        disabled={isStreaming}
                        onClick={() => askQuestion(language === "en" ? slide.ask.en : slide.ask.ar)}
                        className="ec-photo group relative mt-5 block aspect-[16/8] w-full overflow-hidden rounded-3xl border border-[#e6d5bd] bg-[#2a2016] text-start shadow-md"
                      >
                        <img src={isNarrow ? slide.src.replace("/images/bg/", "/images/bg-sm/") : slide.src} alt={language === "en" ? slide.en : slide.ar} className="size-full object-cover transition duration-700 group-hover:scale-105" />
                        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3.5 pt-12">
                          <span>
                            <span className="block text-[11px] font-semibold text-white/80">{language === "en" ? "Behind you right now" : "اللي وراك الحين"}</span>
                            <span className="font-kufi block text-base font-bold text-white">{language === "en" ? slide.en : slide.ar}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#6c3a1c] shadow">
                            {language === "en" ? "Tell me about it" : "علّمني عنه"}
                          </span>
                        </span>
                      </button>
                    );
                  })()}

                  <div className="mt-4 grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { Icon: Landmark, ar: "ممالح القَصَب", en: "The salt pans", q: t.suggestedQuestions[0] },
                      { Icon: ScrollText, ar: "قصر الزاحم", en: "Al-Zahim palace", q: t.suggestedQuestions[1] },
                      { Icon: Coffee, ar: "المقاهي والديوانيات", en: "Cafés & majlis", q: t.suggestedQuestions[2] },
                      { Icon: MapPinned, ar: "وين الموسم؟", en: "Where's the season?", q: t.suggestedQuestions[3] },
                      { Icon: Ticket, ar: "التذاكر والمواعيد", en: "Tickets & hours", q: language === "en" ? "How can I get tickets for the salt season?" : "كيف أحصل على تذكرة موسم ملح القصب؟" },
                      { Icon: Sparkles, ar: "وش أسوي اليوم؟", en: "What to do today?", q: language === "en" ? "Plan my day in Al-Qasab" : "رتّب لي يومي في القصب" },
                    ].map(({ Icon, ar, en: enLabel, q }) => (
                      <button
                        key={ar}
                        type="button"
                        disabled={isStreaming || !q}
                        onClick={() => q && askQuestion(q)}
                        className="group flex items-center gap-2.5 rounded-2xl border border-[#e6d5bd] bg-white p-3 text-start text-sm font-bold text-[#3a2a1c] shadow-xs transition hover:border-[#94532d] hover:bg-[#faf4ea] active:scale-[0.98]"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f3ebdf] text-[#94532d] transition group-hover:bg-[#94532d] group-hover:text-white">
                          <Icon className="size-4.5" />
                        </span>
                        <span className="min-w-0 leading-tight">{language === "en" ? enLabel : ar}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-6">
                  {messages.map(m => (
                    <div key={m.id}>
                      <MessageBubble message={m} language={language} />
                      {m.role === "assistant" && m.weather && (
                        <WeatherCard weather={m.weather} language={language} />
                      )}
                      {m.role === "assistant" && m.images && m.images.length > 0 && (
                        <PlaceGallery images={m.images} language={language} />
                      )}
                      {m.role === "assistant" && m.mapsUrl && (
                        <a
                          href={m.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pg-enter mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[#e6d5bd] bg-white px-3 py-2 text-xs font-bold text-[#6c3a1c] shadow-sm hover:bg-[#faf4ea]"
                        >
                          <ExternalLink className="size-3.5" />
                          {language === "en" ? "More photos on Google Maps" : "صور أكثر على Google Maps"}
                        </a>
                      )}
                      {m.role === "assistant" && m.ticketUrl && (
                        <a
                          href={m.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pg-enter mt-2 ms-2 inline-flex items-center gap-1.5 rounded-xl bg-[#B2512F] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#963f22]"
                        >
                          <Ticket className="size-3.5" />
                          {language === "en" ? "Book your free ticket" : "احجز تذكرتك المجانية"}
                        </a>
                      )}
                      {m.role === "assistant" && m.link && (
                        <a
                          href={m.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pg-enter mt-2 ms-2 inline-flex items-center gap-1.5 rounded-xl border border-[#e4d2ba] bg-white px-3 py-2 text-xs font-bold text-[#B2512F] shadow-sm hover:bg-[#f3ebdf]"
                        >
                          <ExternalLink className="size-3.5" />
                          {m.link.label}
                        </a>
                      )}
                      {m.role === "assistant" && m.showMap && m.locationData && (
                        <LocationMapCard location={m.locationData} language={language} />
                      )}
                      {m.role === "assistant" && m.id === lastAssistantId && !isStreaming && m.followUps && m.followUps.length > 0 && (
                        <div className="pg-enter mt-3 flex flex-wrap gap-2" aria-label={language === "en" ? "Ask next" : "اسأل بعدها"}>
                          {m.followUps.map(q => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => askQuestion(q)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#e5d2b8] bg-[#fdfaf5] px-3 py-1.5 text-xs font-semibold text-[#6c3a1c] shadow-xs hover:border-[#94532d] hover:bg-[#f5eadb] transition active:scale-95"
                            >
                              <CornerDownLeft className={`size-3.5 text-[#94532d] ${language === "en" ? "-scale-x-100" : ""}`} />
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Quick Topic Pills & Input Bar */}
            <div className="border-t border-[#ede1cd] bg-white/90 p-3 sm:p-5">
              {/* Quick Pills row */}
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-2.5 scroll-smooth justify-center">
                {[
                  { label: language === "en" ? "Heritage Cafes" : "مقاهي القصب", q: language === "en" ? "What are the heritage cafes in Al-Qasab?" : "ما هي المقاهي والديوانيات في القصب؟" },
                  { label: language === "en" ? "Season Location" : "موقع الفعاليات", q: language === "en" ? "Where is Al-Qasab Salt Season located?" : "أين يقع موسم ملح القصب على الخريطة؟" },
                  { label: language === "en" ? "Historic Salt Flats" : "ممالح القصب", q: language === "en" ? "Tell me about Al-Qasab salt flats and history" : "حدثني عن ممالح القصب التاريخية والجفار" },
                  { label: language === "en" ? "Get Tickets" : "الحصول على التذاكر", q: language === "en" ? "How can I get tickets for the salt season?" : "كيف أحصل على تذكرة موسم ملح القصب؟" },
                  { label: language === "en" ? "Live Weather" : "طقس القصب", q: language === "en" ? "What is the current weather in Al-Qasab?" : "ما هي درجات الحرارة والطقس الآن في القصب؟" },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isStreaming}
                    onClick={() => askQuestion(chip.q)}
                    className="shrink-0 rounded-full border border-[#e5d2b8] bg-[#fdfaf5] px-3 py-1.5 text-[11px] font-semibold text-[#6c3a1c] shadow-xs hover:border-[#94532d] hover:bg-[#f5eadb] transition active:scale-95 disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
                {(pendingPhoto || photoError) && (
                  <div className="mb-2 flex items-center gap-2 px-1">
                    {pendingPhoto && (
                      <div className="relative">
                        <img src={pendingPhoto.preview} alt={language === "en" ? "Photo to send" : "الصورة اللي بترسلها"} className="size-14 rounded-xl border border-[#e6d5bd] object-cover shadow-xs" />
                        <button
                          type="button"
                          onClick={() => setPendingPhoto(null)}
                          className="absolute -top-2 -left-2 grid size-6 place-items-center rounded-full bg-[#3a2a1c] text-white shadow"
                          aria-label={language === "en" ? "Remove photo" : "احذف الصورة"}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}
                    <p className={`text-[11px] ${photoError ? "text-[#94532d]" : "text-[#786450]"}`}>
                      {photoError || (language === "en" ? "Add a question, or just send: Al-Dahiya will tell you what it is." : "اكتب سؤالك أو أرسلها كذا، والداهية يقول لك وش هي.")}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-[1.35rem] border border-[#e4cfb3] bg-white p-2 shadow-sm focus-within:border-[#94532d] focus-within:ring-2 focus-within:ring-[#94532d]/10">
                  <button
                    ref={callButtonRef}
                    type="button"
                    onClick={handleStartCall}
                    disabled={isCallAnimating}
                    className="relative size-11 shrink-0 rounded-2xl bg-[#6c3a1c] text-white flex items-center justify-center hover:bg-[#72130c] transition shadow-sm disabled:opacity-80 cursor-pointer"
                    title={t.liveCallTooltip}
                  >
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <Phone className="size-5 text-amber-200" />
                  </button>

                  <button
                    type="button"
                    onClick={handleStartCall}
                    disabled={isCallAnimating}
                    // Opens the same voice call as the phone button: hidden on phones to leave room for typing
                    className="hidden sm:flex size-11 shrink-0 rounded-2xl bg-[#f5eadb] hover:bg-[#eedbc1] text-[#94532d] items-center justify-center transition shadow-xs disabled:opacity-80 cursor-pointer"
                    title={t.micHoldTooltip}
                  >
                    <Mic className="size-5" />
                  </button>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onPickPhoto}
                    className="hidden"
                    aria-hidden
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isStreaming}
                    className="size-11 shrink-0 rounded-2xl bg-[#f5eadb] hover:bg-[#eedbc1] text-[#94532d] flex items-center justify-center transition shadow-xs disabled:opacity-60 cursor-pointer"
                    title={language === "en" ? "Snap & ask: send a photo" : "صوّر واسأل"}
                    aria-label={language === "en" ? "Snap & ask: send a photo" : "صوّر واسأل"}
                  >
                    <Camera className="size-5" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isNarrow ? (language === "en" ? "Ask Al-Dahiya..." : "اسأل الداهية...") : t.defaultPlaceholder}
                    aria-label={t.defaultPlaceholder}
                    rows={1}
                    disabled={isStreaming}
                    className="no-scrollbar min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-3 text-base sm:text-sm focus:outline-none"
                  />

                  <button
                    type="submit"
                    aria-label={language === "en" ? "Send" : "إرسال"}
                    disabled={(!input.trim() && !pendingPhoto) || isStreaming}
                    className="size-11 shrink-0 rounded-2xl bg-[#94532d] text-white flex items-center justify-center hover:bg-[#78411f] transition disabled:opacity-50"
                  >
                    {isStreaming ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <SendHorizontal className="size-5 rotate-180" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] text-[#8d7259]">
                  {t.iphoneNotice}
                </p>
              </form>
            </div>
          </section>
        </section>

        <footer className="pb-2 text-center text-[11px] text-[#8d7259]">
          {t.footerText}
        </footer>
      </div>
    </main>
  );
}
