import React, { useEffect, useRef, useState } from "react";
import { Loader2, Phone, Play, Square, X } from "lucide-react";
import type { Language } from "../i18n";

// First visit only: the grandfather greets the visitor in a small card. The voice plays only
// when the visitor taps it (browsers block sound without a tap); the audio is kept on the
// device so the speech quota is spent once per visitor.
const SEEN_KEY = "dahiah:welcomed";
const AUDIO_KEY = "dahiah:welcome-audio";

const TEXT_AR =
  "يا هلا والله ومسهّلا! أنا الداهية، دليلك في القَصَب وموسم الملح. اسألني عن الممالح والبلدة القديمة والقهاوي، أو اتصل علي وأسولف معك بالصوت.";
const TEXT_EN =
  "Welcome! I'm Al-Dahiya, your guide to Al-Qasab and its salt season. Ask me about the salt pans, the old town and the cafés, or call me and we'll talk.";

function readLS(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function writeLS(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}

export function WelcomeGrandpa({ language = "ar", onCall }: { language?: Language; onCall?: () => void }) {
  const en = language === "en";
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (readLS(SEEN_KEY)) return;
    const id = setTimeout(() => setShow(true), 1800);
    return () => clearTimeout(id);
  }, []);

  const close = () => {
    audioRef.current?.pause();
    writeLS(SEEN_KEY, "1");
    setShow(false);
  };

  const play = async () => {
    if (state === "playing") {
      audioRef.current?.pause();
      setState("idle");
      return;
    }
    let audio = en ? null : readLS(AUDIO_KEY);
    if (!audio) {
      setState("loading");
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: en ? TEXT_EN : TEXT_AR }),
        });
        const data = await res.json();
        audio = data.audio || null;
        if (audio && !en && audio.length < 1_500_000) writeLS(AUDIO_KEY, audio);
      } catch {}
    }
    if (!audio) {
      setState("idle");
      return;
    }
    const el = audioRef.current || new Audio();
    audioRef.current = el;
    el.src = `data:audio/mp3;base64,${audio}`;
    el.onended = () => setState("idle");
    el.play().then(() => setState("playing")).catch(() => setState("idle"));
  };

  if (!show) return null;

  return (
    <div
      dir={en ? "ltr" : "rtl"}
      className="wg-in fixed inset-x-3 bottom-24 z-[45] mx-auto max-w-sm overflow-hidden rounded-[1.6rem] border border-[#e6d5bd] bg-[#fdfaf5] shadow-2xl lg:inset-x-auto lg:bottom-6 lg:start-6"
      role="dialog"
      aria-label={en ? "Welcome" : "ترحيب"}
    >
      <div className="sadu-strip" />
      <div className="flex gap-3 p-3.5">
        <img
          src="/images/shayeb/base.jpg"
          alt=""
          className="size-16 shrink-0 rounded-2xl border border-[#e6d5bd] object-cover object-top"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-['Alexandria'] text-base font-bold text-[#3a2a1c]">{en ? "Welcome!" : "يا هلا والله!"}</p>
            <button type="button" onClick={close} className="-mt-1 grid size-7 shrink-0 place-items-center rounded-full text-[#786450] hover:bg-[#f3ebdf]" aria-label={en ? "Close" : "إغلاق"}>
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-[#584535]">{en ? TEXT_EN : TEXT_AR}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={play}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#94532d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#78411f] active:scale-95"
            >
              {state === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : state === "playing" ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
              {state === "playing" ? (en ? "Stop" : "وقّف") : en ? "Hear his welcome" : "اسمع ترحيبه"}
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                onCall?.();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#94532d] px-3 py-1.5 text-xs font-bold text-[#94532d] hover:bg-[#f3ebdf] active:scale-95"
            >
              <Phone className="size-3.5" />
              {en ? "Call him" : "اتصل عليه"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
