// «جواز الملح»: collect a stamp at each Al-Qasab stop, by scanning the QR sign there
// (/?stamp=<code>, checked by the server) or with «أنا هنا» (the phone's location).
// Six stamps make the visitor an «مستكشف القصب» with a certificate card to share.
// Stamps live in this browser only (localStorage), like a paper passport in your pocket.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Award, Check, Loader2, MapPin, Navigation, Share2, Stamp, X } from "lucide-react";
import { PASSPORT_STOPS, isNearStop, type PassportStop } from "../../server/saltPassport.ts";
import { directionsUrl } from "./LeafletMap";
import { drawShareCard, shareOrDownload } from "./shareCard";
import type { Language } from "../i18n";

const STORE_KEY = "saltPassport.v1";
type Saved = { stamps: Record<string, number>; name: string };

function readSaved(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return { stamps: raw && typeof raw.stamps === "object" ? raw.stamps : {}, name: typeof raw?.name === "string" ? raw.name : "" };
  } catch {
    return { stamps: {}, name: "" };
  }
}
function writeSaved(s: Saved) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* private mode: the passport still works for this visit */
  }
}

const fmtNum = (n: number, en: boolean) => (en ? String(n) : n.toLocaleString("ar-SA"));
function fmtDistance(m: number, en: boolean) {
  if (m >= 1000) {
    const km = Math.round(m / 100) / 10;
    return en ? `${km} km` : `${km.toLocaleString("ar-SA")} كم`;
  }
  return en ? `${Math.round(m)} m` : `${Math.round(m).toLocaleString("ar-SA")} متر`;
}

export function SaltPassport({ language = "ar" }: { language?: Language }) {
  const en = language === "en";
  const [saved, setSaved] = useState<Saved>(() => readSaved());
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; good: boolean } | null>(null);
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [making, setMaking] = useState(false);

  const count = PASSPORT_STOPS.filter((s) => saved.stamps[s.id]).length;
  const total = PASSPORT_STOPS.length;
  const complete = count === total;
  const name = (s: PassportStop) => (en ? s.en : s.ar);

  const update = useCallback((fn: (s: Saved) => Saved) => {
    setSaved((prev) => {
      const next = fn(prev);
      writeSaved(next);
      return next;
    });
  }, []);

  const addStamp = useCallback(
    (stop: PassportStop) => {
      const isNew = !savedRef.current.stamps[stop.id];
      if (isNew) update((prev) => ({ ...prev, stamps: { ...prev.stamps, [stop.id]: prev.stamps[stop.id] || Date.now() } }));
      setNotice({
        text: isNew
          ? en ? `Stamped: ${stop.en}!` : `انختم جوازك: ${stop.ar}!`
          : en ? `You already have the ${stop.en} stamp.` : `عندك ختم ${stop.ar} من قبل.`,
        good: true,
      });
      setCard(null);
    },
    [en, update]
  );

  // Arrived from a QR sign: /?stamp=<code>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("stamp");
    if (!code) return;
    params.delete("stamp");
    const clean = window.location.pathname + (params.toString() ? `?${params}` : "") + window.location.hash;
    window.history.replaceState(null, "", clean);
    setOpen(true);
    fetch(`/api/passport/stamp?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        const stop = PASSPORT_STOPS.find((s) => s.id === d.id);
        if (stop) addStamp(stop);
      })
      .catch(() =>
        setNotice({ text: en ? "This QR code isn't a Salt Passport stamp." : "هذا الرمز مو ختم من جواز الملح.", good: false })
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes; no page scroll behind the sheet
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => () => { if (card) URL.revokeObjectURL(card.url); }, [card]);

  const stampHere = (stop: PassportStop) => {
    if (!("geolocation" in navigator)) {
      setNotice({ text: en ? "This phone can't share its location. Scan the QR sign instead." : "جوالك ما يدعم تحديد الموقع، امسح رمز QR اللي عند المكان.", good: false });
      return;
    }
    setBusyId(stop.id);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusyId(null);
        const check = isNearStop(stop, { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        if (check.ok) addStamp(stop);
        else
          setNotice({
            text: en
              ? `You're ${fmtDistance(check.distance, true)} from ${stop.en}. Get there and try again, or scan the QR sign.`
              : `أنت تبعد ${fmtDistance(check.distance, false)} عن ${stop.ar}. قرّب منه وجرّب مرة ثانية، أو امسح رمز QR اللي هناك.`,
            good: false,
          });
      },
      (err) => {
        setBusyId(null);
        setNotice({
          text:
            err.code === err.PERMISSION_DENIED
              ? en ? "Location is off for this site. Allow it, or scan the QR sign at the place." : "الموقع مقفل لهذا الموقع. اسمح فيه من إعدادات المتصفح، أو امسح رمز QR اللي عند المكان."
              : en ? "Couldn't get your location. Try again outdoors." : "ما قدرت أحدد موقعك، جرّب مرة ثانية وأنت برا المبنى.",
          good: false,
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const makeCard = async () => {
    setMaking(true);
    try {
      const blob = await drawShareCard({ stamps: saved.stamps, name: saved.name, lang: en ? "en" : "ar" });
      setCard({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setNotice({ text: en ? "Couldn't draw the card, try again." : "ما قدرت أرسم البطاقة، جرّب مرة ثانية.", good: false });
    } finally {
      setMaking(false);
    }
  };

  const dots = (
    <div className="flex items-center gap-1.5" aria-hidden>
      {PASSPORT_STOPS.map((s) => (
        <span
          key={s.id}
          className={`grid size-6 place-items-center rounded-full border-2 ${
            saved.stamps[s.id] ? "border-[#b82e24] bg-[#b82e24] text-white" : "border-dashed border-[#e3c9c5] bg-white"
          }`}
        >
          {saved.stamps[s.id] && <Check className="size-3.5" strokeWidth={3} />}
        </span>
      ))}
    </div>
  );

  return (
    <>
      <div className="rounded-[1.7rem] border border-[#f2d6d3] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#fff5f4] border border-[#f5dfdc] px-2 py-0.5 text-[10px] font-bold text-[#a82319]">
            {fmtNum(count, en)} / {fmtNum(total, en)}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#3a1210]">
            <Stamp className="size-4 text-[#b82e24]" />
            <span>{en ? "Salt Passport" : "جواز الملح"}</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[#7d6564]">
          {complete
            ? en ? "You're an Al-Qasab Explorer! Share your certificate." : "صرت مستكشف القَصَب! شارك شهادتك."
            : en ? "Collect a stamp at each landmark and get the Al-Qasab Explorer certificate." : "اجمع ختم من كل معلم، وخذ شهادة «مستكشف القَصَب» في الأخير."}
        </p>
        <div className="mt-3">{dots}</div>
        <button
          onClick={() => setOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#b82e24] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#992017] transition"
        >
          {complete ? <Award className="size-4" /> : <Stamp className="size-4" />}
          {complete ? (en ? "Open my certificate" : "افتح شهادتي") : en ? "Open the passport" : "افتح الجواز"}
        </button>
      </div>

      {open &&
        createPortal(
          <div className="pg-viewer fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-6" onClick={() => setOpen(false)}>
            <div
              dir={en ? "ltr" : "rtl"}
              role="dialog"
              aria-modal="true"
              aria-label={en ? "Salt Passport" : "جواز الملح"}
              onClick={(e) => e.stopPropagation()}
              className="tr-sheet flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.8rem] sm:rounded-[1.8rem] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#f6dedc] px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold text-[#3a1210]">{en ? "Salt Passport" : "جواز الملح"}</p>
                  <p className="text-[11px] text-[#7d6564]">
                    {en ? "Scan the QR sign at each place, or tap «I'm here» when you're there" : "امسح رمز QR عند كل مكان، أو اضغط «أنا هنا» وأنت فيه"}
                  </p>
                </div>
                <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-[#fff5f4] text-[#8e1b12] hover:bg-[#feeceb]" title={en ? "Close" : "إغلاق"} aria-label={en ? "Close" : "إغلاق"}>
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {/* Progress */}
                <div className="rounded-2xl bg-[#fff8f7] border border-[#f6e1de] p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#3a1210]">
                    <span>{complete ? (en ? "All stamps collected!" : "جمعت كل الأختام!") : en ? "Your stamps" : "أختامك"}</span>
                    <span className="text-[#b82e24]">
                      {fmtNum(count, en)} {en ? "of" : "من"} {fmtNum(total, en)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f6e1de]">
                    <div className="h-full rounded-full bg-[#b82e24] transition-all duration-500" style={{ width: `${(100 * count) / total}%` }} />
                  </div>
                </div>

                {notice && (
                  <div
                    role="status"
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                      notice.good ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"
                    }`}
                  >
                    {notice.text}
                  </div>
                )}

                {/* Stops */}
                <ul className="space-y-2">
                  {PASSPORT_STOPS.map((s) => {
                    const at = saved.stamps[s.id];
                    return (
                      <li key={s.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${at ? "border-[#f0c9c4] bg-[#fffaf9]" : "border-[#f2d8d6] bg-white"}`}>
                        <span
                          className={`grid size-11 shrink-0 place-items-center rounded-full border-[3px] ${
                            at ? "border-[#b82e24] bg-[#b82e24]/10 text-[#b82e24] -rotate-12" : "border-dashed border-[#e3c9c5] text-[#d4b5b1]"
                          }`}
                        >
                          {at ? <Check className="size-6" strokeWidth={3} /> : <Stamp className="size-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[#3a1210]">{name(s)}</p>
                          <p className="text-[11px] text-[#7d6564]">
                            {at
                              ? (en ? "Stamped " : "انختم ") + new Date(at).toLocaleDateString(en ? "en-GB" : "ar-SA", { day: "numeric", month: "long" })
                              : en ? "Not stamped yet" : "ما انختم للحين"}
                          </p>
                        </div>
                        {!at && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            <a
                              href={directionsUrl(s.lat, s.lng)}
                              target="_blank"
                              rel="noreferrer"
                              className="grid size-9 place-items-center rounded-xl border border-[#f2d6d3] text-[#8e1b12] hover:bg-[#fff5f4]"
                              title={en ? "Directions" : "خذني له"}
                              aria-label={en ? `Directions to ${s.en}` : `الطريق إلى ${s.ar}`}
                            >
                              <Navigation className="size-4" />
                            </a>
                            <button
                              onClick={() => stampHere(s)}
                              disabled={busyId !== null}
                              className="inline-flex items-center gap-1 rounded-xl bg-[#b82e24] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#992017] disabled:opacity-60"
                            >
                              {busyId === s.id ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
                              {en ? "I'm here" : "أنا هنا"}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Share card */}
                <div className="rounded-2xl border border-[#f2d6d3] p-3 space-y-2.5">
                  <p className="text-xs font-bold text-[#3a1210]">
                    {complete ? (en ? "Your Al-Qasab Explorer certificate" : "شهادة «مستكشف القَصَب»") : en ? "«I visited Al-Qasab» card" : "بطاقة «زرت القَصَب»"}
                  </p>
                  <label className="block text-[11px] text-[#7d6564]">
                    {en ? "Name on the card (optional)" : "الاسم على البطاقة (اختياري)"}
                    <input
                      value={saved.name}
                      maxLength={40}
                      onChange={(e) => {
                        const v = e.target.value;
                        update((p) => ({ ...p, name: v }));
                        setCard(null);
                      }}
                      className="mt-1 w-full rounded-xl border border-[#f2d6d3] bg-[#fffbfb] px-3 py-2 text-base sm:text-sm text-[#3a1210] focus:border-[#b82e24] focus:outline-none"
                      placeholder={en ? "Your name" : "اسمك"}
                    />
                  </label>
                  {card ? (
                    <div className="space-y-2">
                      <img src={card.url} alt={en ? "Your share card" : "بطاقتك"} className="mx-auto w-full max-w-[260px] rounded-xl border border-[#f2d6d3] shadow-sm" />
                      <button
                        onClick={async () => {
                          const r = await shareOrDownload(card.blob, en ? "en" : "ar");
                          if (r === "downloaded") setNotice({ text: en ? "Saved to your downloads." : "انحفظت البطاقة في التنزيلات.", good: true });
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#b82e24] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#992017]"
                      >
                        <Share2 className="size-4" />
                        {en ? "Share or save" : "شارك أو احفظ"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={makeCard}
                      disabled={count === 0 || making}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#b82e24] px-3 py-2.5 text-xs font-bold text-[#b82e24] hover:bg-[#fff5f4] disabled:opacity-50"
                    >
                      {making ? <Loader2 className="size-4 animate-spin" /> : <Award className="size-4" />}
                      {count === 0 ? (en ? "Get a stamp first" : "اختم أول ختم عشان تطلع بطاقتك") : en ? "Make my card" : "سوّ بطاقتي"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
