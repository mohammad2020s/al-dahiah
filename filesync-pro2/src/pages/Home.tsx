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
} from "lucide-react";
import { MalhAlQasabLogo, TanmiahLogo } from "../components/BrandLogos";
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
    <div className="mt-3 overflow-hidden rounded-[1.35rem] border border-[#f2d4d1] bg-gradient-to-br from-white to-[#fff6f5] p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f6dedc] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#b82e24] text-white shadow-sm shadow-red-900/10">
            <CloudSun className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#3a1210]">{t.weatherCardTitle}</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#b82e24]/10 px-2 py-0.5 text-[10px] font-semibold text-[#b82e24]">
                <span className="size-1.5 rounded-full bg-[#b82e24] animate-pulse" />
                {weather.source === "fallback" ? t.weatherFallbackBadge : t.weatherLiveBadge}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-[#7d6564]">
              {weather.source === "fallback" ? t.weatherFallbackAttribution : t.weatherGoogleAttribution}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-1 text-right">
          <span className="font-display-ar text-2xl font-bold text-[#a82319] sm:text-3xl">{weather.temperature}°</span>
          <span className="text-xs font-semibold text-[#8e1b12]">{t.celsius}</span>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[#f5dfdc] bg-white p-2.5 text-center shadow-xs">
          <p className="text-[10px] font-medium text-[#7d6564]">{t.weatherCondition}</p>
          <p className="mt-1 text-xs font-bold text-[#2d1716]">{weather.conditionText}</p>
        </div>
        <div className="rounded-xl border border-[#f5dfdc] bg-white p-2.5 text-center shadow-xs">
          <p className="text-[10px] font-medium text-[#7d6564]">{t.weatherFeelsLike}</p>
          <p className="mt-1 text-xs font-bold text-[#2d1716]">{weather.feelsLike}° {t.celsius}</p>
        </div>
        <div className="rounded-xl border border-[#f5dfdc] bg-white p-2.5 text-center shadow-xs">
          <p className="text-[10px] font-medium text-[#7d6564]">{t.weatherHumidity}</p>
          <p className="mt-1 text-xs font-bold text-[#2d1716]">{weather.humidity}%</p>
        </div>
        <div className="rounded-xl border border-[#f5dfdc] bg-white p-2.5 text-center shadow-xs">
          <p className="text-[10px] font-medium text-[#7d6564]">{t.weatherWindSpeed}</p>
          <p className="mt-1 text-xs font-bold text-[#2d1716]">{weather.windSpeed} {t.weatherKmH}</p>
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
    <div className="my-4 overflow-hidden rounded-3xl border border-[#f2d4d1] bg-white shadow-lg shadow-gray-200/50 w-full">
      <LeafletMap
        className="h-64 sm:h-72"
        points={mapPoints}
        activeId={activeId}
        fitIds={servicePins ? servicePins.map((p) => p.id) : multiPin ? CAFE_PIN_IDS : undefined}
        zoom={17}
      />
      <div className="flex items-center justify-between gap-2 border-t border-[#f4dedd] px-3 py-2.5">
        <span className="min-w-0 truncate text-xs font-bold text-[#321210]">
          {servicePins ? (language === "en" && location.nameEn ? location.nameEn : location.name) : locationTitle}
        </span>
        {allPlaces || servicePins ? (
          <span className="shrink-0 text-[11px] text-[#7d6564]">{language === "en" ? "Tap a pin to see its name" : "اضغط على أي دبوس يطلع اسمه"}</span>
        ) : (
        <a
          href={directionsUrl(activeCoordinates.lat, activeCoordinates.lng)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#b82e24] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#992017]"
        >
          <ExternalLink className="size-3.5" />
          {language === "en" ? "Take me there" : "خذني لها"}
        </a>
        )}
      </div>

      {servicePins && (
        <div className="border-t border-[#f4dedd] bg-[#fffaf9] p-3 sm:p-4 space-y-1.5">
          {servicePins.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#f2d8d6] bg-white px-2.5 py-2">
              <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#321210]">
                <span className={`size-2.5 shrink-0 rounded-full ${p.kind === "wc" ? "bg-[#2563a8]" : "bg-[#2f7d4f]"}`} />
                <span className="truncate">{language === "en" && p.nameEn ? p.nameEn : p.name}</span>
              </span>
              <a
                href={directionsUrl(p.lat, p.lng)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#b82e24] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#992017]"
              >
                <ExternalLink className="size-3" />
                {language === "en" ? "Take me there" : "خذني له"}
              </a>
            </div>
          ))}
        </div>
      )}

      {isCafes && location.places && (
        <div className="border-t border-[#f4dedd] bg-[#fffaf9] p-3 sm:p-4">
          <div className="space-y-2">
            {location.places.map((place: any) => (
              <div
                key={place.id}
                className="rounded-xl border border-[#f2d8d6] bg-white p-2.5 transition hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#321210]">{place.name}</span>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800">
                        <Star className="size-2.5 fill-amber-500 text-amber-500" />
                        {place.rating} / 5
                      </span>
                    </div>
                    <p className="mt-1 text-[10.5px] text-[#5a4342]">{place.description}</p>
                  </div>
                  <a
                    href={place.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-[#b82e24] px-2 py-1 text-[10px] font-bold text-white shadow-xs hover:bg-[#992017]"
                  >
                    <ExternalLink className="size-3" />
                    <span>Google</span>
                  </a>
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
    navigator.clipboard?.writeText(message.content);
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
        body: JSON.stringify({ text: message.content }),
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
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#b82e24] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-red-950/10">
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
              <span className="text-xs font-bold text-[#3a1210]">{t.appName}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {message.content && (
                <>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-full border border-[#f2d4d1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8e1b12] shadow-xs transition hover:bg-[#fff2f1]"
                  >
                    {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-[#b82e24]" />}
                    <span>{copied ? "تم النسخ" : "نسخ"}</span>
                  </button>

                  <button
                    onClick={handleToggleSpeak}
                    disabled={isLoadingAudio}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border border-[#f2d4d1] bg-white text-[#8e1b12] hover:bg-[#fff2f1] shadow-xs"
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
                        <Volume2 className="size-3.5 text-[#b82e24]" />
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
                ? "border-[#f4d5d2] bg-[#fff8f7] text-[#6d2520]"
                : "border-[#f2d6d3] bg-white text-[#241515]"
            }`}
          >
            {message.content ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="flex items-center gap-2 py-1 text-xs text-[#7d6564]">
                <Loader2 className="size-4 animate-spin text-[#b82e24]" />
                <span>{t.thinking}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
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
      className="soft-grid relative min-h-screen overflow-hidden bg-[#faf4f4] text-[#2d1716]"
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

      {isVoiceCallOpen && (
        <Suspense fallback={null}>
          <VoiceCall
            isOpen={isVoiceCallOpen}
            onClose={() => setIsVoiceCallOpen(false)}
            language={language}
          />
        </Suspense>
      )}

      <div className="relative mx-auto flex min-h-screen max-w-[1480px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#f2d6d3] bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
          {/* Logo & Name */}
          <div className="flex items-center gap-3">
            <MalhAlQasabLogo size="md" className="rounded-2xl" />
            <div>
              <h1 className="font-['Alexandria'] text-xl sm:text-2xl font-bold leading-none text-[#992017]">
                الداهية
              </h1>
              <p className="mt-1 text-[10px] font-semibold text-[#a14e47]">
                {t.tagline}
              </p>
            </div>
          </div>

          {/* Sponsor Tag */}
          <div className="flex items-center gap-2.5 rounded-full border border-[#f2d6d3] bg-[#fffbfb] px-4 py-1.5 shadow-xs">
            <div className="text-right leading-tight">
              <p className="text-[9px] font-medium text-[#b85c54]">{t.sponsoredBy}</p>
              <p className="mt-0.5 text-[11px] font-bold text-[#6a1914]">
                {t.sponsorName}
              </p>
            </div>
            <div className="grid size-8 place-items-center rounded-full bg-white border border-[#f2d6d3] p-0.5">
              <TanmiahLogo size="sm" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#f2d6d3] bg-[#fff7f6] px-3 py-1.5 text-xs font-semibold text-[#a82319]">
              <span className="size-2 rounded-full bg-[#b82e24] animate-pulse" />
              <span>{t.onlineStatus}</span>
            </div>

            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#f2d6d3] bg-[#fff7f6] px-3 py-1.5 text-xs font-bold text-[#8e1b12] shadow-xs hover:bg-[#feeceb] transition"
            >
              <Globe className="size-3.5 text-[#b82e24]" />
              <span>{language === "ar" ? "English / العربية" : "العربية / English"}</span>
            </button>

            <button
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-[#7d5654] hover:bg-[#feeceb] hover:text-[#8e1b12] transition"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{t.newChat}</span>
            </button>
          </div>
        </header>

        {/* Two-column layout */}
        <section className="flex flex-col lg:flex-row gap-5 py-5 flex-1">
          {/* Sidebar */}
          <aside className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4">
            {/* Top Red Gradient Card */}
            <div className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-[#801b13] via-[#9e2319] to-[#b32c21] p-5 text-white shadow-lg shadow-red-950/20">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
                <Sparkles className="size-3" />
                {t.specialtyBadge}
              </span>
              <h2 className="mt-3 font-['Alexandria'] text-lg sm:text-xl font-bold leading-snug">
                {t.guideTitle1} <br />
                {t.guideTitle2}
              </h2>
              <p className="mt-2 text-xs leading-6 text-[#fae1e0]">
                {t.guideDesc}
              </p>
            </div>

            <SeasonCountdown language={language} onAsk={askQuestion} />

            <TourRoute language={language} onAsk={askQuestion} />

            <SaltPassport language={language} />

            {/* Weather Card */}
            {weatherData && (
              <div className="rounded-[1.7rem] border border-[#f2d6d3] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#fff5f4] border border-[#f5dfdc] px-2 py-0.5 text-[9px] font-bold text-[#a82319]">
                    Google Weather
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a1210]">
                    <CloudSun className="size-4 text-[#b82e24]" />
                    <span>{t.weatherNow}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => askQuestion(language === "en" ? "What is the weather in Al-Qasab now?" : "ما هو طقس القصب الآن؟")}
                    className="rounded-xl border border-[#f2d6d3] bg-[#fff5f4] px-3 py-1.5 text-[10px] font-bold text-[#8e1b12] hover:bg-[#feeceb] transition"
                  >
                    {t.askAssistant}
                  </button>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-[#a82319]">{weatherData.temperature}°</p>
                    <p className="text-[11px] text-[#7d6564] text-right">{weatherData.conditionText}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Policy Badge Card */}
            <div className="rounded-[1.4rem] border border-[#f2d6d3] bg-white/85 p-4 text-[11px] leading-5 text-[#6b4c4a] flex items-center gap-2">
              <BadgeCheck className="size-4 text-[#b82e24] shrink-0" />
              <span>{t.scopeNotice}</span>
            </div>
          </aside>

          {/* Main Chat Container */}
          <section className="flex-1 flex min-h-[640px] flex-col overflow-hidden rounded-[1.8rem] border border-[#f2d6d3] bg-white/95 shadow-md">
            {/* Top Bar inside Chat */}
            <div className="flex items-center justify-between border-b border-[#f6dedc] bg-white px-5 py-3.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                <Timer className="size-3 text-emerald-600 animate-pulse" />
                <span>{t.sevenSecondBadge}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-[#3a1210]">{t.chatHeaderTitle}</p>
                <p className="text-[11px] text-[#7d6564]">{t.chatHeaderSubtitle}</p>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-7">
              {messages.length === 0 ? (
                /* Welcome Screen in the Center */
                <div className="mx-auto flex min-h-[400px] max-w-xl flex-col items-center justify-center text-center">
                  <div className="mb-4 size-32 rounded-3xl border border-[#f2d6d3] shadow-md inline-flex items-center justify-center overflow-hidden bg-white p-1">
                    <MalhAlQasabLogo size="xl" className="w-full h-full rounded-2xl" />
                  </div>
                  <h2 className="font-['Alexandria'] text-2xl sm:text-3xl font-bold text-[#3a1210]">
                    {t.welcomeTitle}
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-[#6b4c4a] max-w-md">
                    {t.welcomeDesc}
                  </p>

                  {/* 4 Suggested Question Cards */}
                  <div className="mt-6 grid w-full gap-2.5 sm:grid-cols-2">
                    {t.suggestedQuestions.slice(0, 4).map((q) => (
                      <button
                        key={q}
                        disabled={isStreaming}
                        onClick={() => askQuestion(q)}
                        className="group flex items-center justify-between rounded-2xl border border-[#f2d6d3] bg-white p-4 text-start text-xs font-medium text-[#3a1210] hover:border-[#b82e24] hover:bg-[#fff5f4] transition shadow-xs"
                      >
                        <span className="flex-1">{q}</span>
                        <ArrowUpLeft className="size-4 text-[#b82e24] shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
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
                          className="pg-enter mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[#f2d6d3] bg-white px-3 py-2 text-xs font-bold text-[#8e1b12] shadow-sm hover:bg-[#fff5f4]"
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
                          className="pg-enter mt-2 ms-2 inline-flex items-center gap-1.5 rounded-xl border border-[#EAD0CB] bg-white px-3 py-2 text-xs font-bold text-[#B2512F] shadow-sm hover:bg-[#F1E7E7]"
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
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#f2d4d1] bg-[#fffbfb] px-3 py-1.5 text-xs font-semibold text-[#8e1b12] shadow-xs hover:border-[#b82e24] hover:bg-[#feeceb] transition active:scale-95"
                            >
                              <CornerDownLeft className={`size-3.5 text-[#b82e24] ${language === "en" ? "-scale-x-100" : ""}`} />
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
            <div className="border-t border-[#f6dedc] bg-white/90 p-3 sm:p-5">
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
                    className="shrink-0 rounded-full border border-[#f2d4d1] bg-[#fffbfb] px-3 py-1.5 text-[11px] font-semibold text-[#8e1b12] shadow-xs hover:border-[#b82e24] hover:bg-[#feeceb] transition active:scale-95 disabled:opacity-50"
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
                        <img src={pendingPhoto.preview} alt={language === "en" ? "Photo to send" : "الصورة اللي بترسلها"} className="size-14 rounded-xl border border-[#f2d6d3] object-cover shadow-xs" />
                        <button
                          type="button"
                          onClick={() => setPendingPhoto(null)}
                          className="absolute -top-2 -left-2 grid size-6 place-items-center rounded-full bg-[#3a1210] text-white shadow"
                          aria-label={language === "en" ? "Remove photo" : "احذف الصورة"}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}
                    <p className={`text-[11px] ${photoError ? "text-[#b82e24]" : "text-[#7d6564]"}`}>
                      {photoError || (language === "en" ? "Add a question, or just send: Al-Dahiya will tell you what it is." : "اكتب سؤالك أو أرسلها كذا، والداهية يقول لك وش هي.")}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-[1.35rem] border border-[#f0d0cc] bg-white p-2 shadow-sm focus-within:border-[#b82e24] focus-within:ring-2 focus-within:ring-[#b82e24]/10">
                  <button
                    ref={callButtonRef}
                    type="button"
                    onClick={handleStartCall}
                    disabled={isCallAnimating}
                    className="relative size-11 shrink-0 rounded-2xl bg-[#8e1b12] text-white flex items-center justify-center hover:bg-[#72130c] transition shadow-sm disabled:opacity-80 cursor-pointer"
                    title={t.liveCallTooltip}
                  >
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    <Phone className="size-5 text-rose-200" />
                  </button>

                  <button
                    type="button"
                    onClick={handleStartCall}
                    disabled={isCallAnimating}
                    // Opens the same voice call as the phone button: hidden on phones to leave room for typing
                    className="hidden sm:flex size-11 shrink-0 rounded-2xl bg-[#feeceb] hover:bg-[#fcd9d6] text-[#b82e24] items-center justify-center transition shadow-xs disabled:opacity-80 cursor-pointer"
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
                    className="size-11 shrink-0 rounded-2xl bg-[#feeceb] hover:bg-[#fcd9d6] text-[#b82e24] flex items-center justify-center transition shadow-xs disabled:opacity-60 cursor-pointer"
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
                    className="size-11 shrink-0 rounded-2xl bg-[#b82e24] text-white flex items-center justify-center hover:bg-[#992017] transition disabled:opacity-50"
                  >
                    {isStreaming ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <SendHorizontal className="size-5 rotate-180" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-center text-[10px] text-[#916b69]">
                  {t.iphoneNotice}
                </p>
              </form>
            </div>
          </section>
        </section>

        <footer className="pb-2 text-center text-[10px] text-[#916b69]">
          {t.footerText}
        </footer>
      </div>
    </main>
  );
}
