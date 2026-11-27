import React, { useEffect, useState } from "react";
import { CircleCheck, ClipboardList, Loader2, Star, X } from "lucide-react";

// «شاركنا رأيك في الموسم»: a one-minute survey (answers → /api/survey, totals on the owner's /survey).
// The options must match server/survey.ts exactly (they are stored as written).
const Q = {
  liked: ["المملحة", "القرية التراثية والدور", "العرضة والسامري", "فعاليات الأطفال والعائلة", "المطاعم والقهوة", "السوق والحرف", "الداهية (الدليل الذكي)"],
  improve: ["الزحام والتنظيم", "المواقف", "الأسعار", "النظافة", "اللوحات والإرشاد", "الفعاليات", "ما فيه شي، كل شي زين"],
  recommend: ["أكيد", "يمكن", "لا"],
  dahiah: ["ساعدني كثير", "ساعدني شوي", "ما استخدمته"],
  from: ["القصب", "شقراء والوشم", "الرياض", "القصيم", "مكان ثاني"],
};
const DONE_KEY = "dahiah:surveyDone";
const done = () => { try { return !!localStorage.getItem(DONE_KEY); } catch { return false; } };

// Owner, 27 Nov: the survey opens by itself after the visitor's third question in the chat (once).
const ASKED_KEY = "dahiah:askedCount";
const AUTO_KEY = "dahiah:surveyAutoShown";
const OPEN_EVENT = "dahiah:openSurvey";
export function noteQuestionAsked(en: boolean) {
  if (en) return;
  try {
    const n = (parseInt(localStorage.getItem(ASKED_KEY) || "0", 10) || 0) + 1;
    localStorage.setItem(ASKED_KEY, String(n));
    if (n < 3 || done() || localStorage.getItem(AUTO_KEY)) return;
    localStorage.setItem(AUTO_KEY, new Date().toISOString());
    // A moment after the third answer, so the visitor sees it first
    setTimeout(() => window.dispatchEvent(new Event(OPEN_EVENT)), 3500);
  } catch {}
}

export function SeasonSurvey({ en }: { en: boolean }) {
  const [open, setOpen] = useState(false);
  const [finished, setFinished] = useState(done());
  useEffect(() => {
    const show = () => { if (!done()) setOpen(true); };
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);
  if (en) return null; // the survey is in Arabic (the season's visitors); the English site skips it

  return (
    <section className="card-contour heritage-frame rounded-[1.7rem] border border-[#e2d5c6] bg-white/95 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-[#3f2a22]">
            <ClipboardList className="size-5 text-[#a5492a]" />
            شاركنا رأيك في الموسم
          </h2>
          <p className="mt-0.5 text-xs text-[#6f5446]">
            {finished ? "وصلنا رأيك، الله يعطيك العافية!" : "٦ أسئلة بالضغط، دقيقة وحدة بس"}
          </p>
        </div>
        {!finished && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#a5492a] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#86391f] active:scale-[0.98]"
          >
            ابدأ
          </button>
        )}
      </div>
      {open && <SurveySheet onClose={() => setOpen(false)} onDone={() => setFinished(true)} />}
    </section>
  );
}

function Chips({ options, value, onChange, many }: { options: string[]; value: string[]; onChange: (v: string[]) => void; many?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(many ? (on ? value.filter((x) => x !== o) : [...value, o]) : on ? [] : [o])}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-[#a5492a] bg-[#a5492a] text-white" : "border-[#e2d5c6] bg-[#fbf6ee] text-[#3f2a22] hover:border-[#a5492a]"}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function SurveySheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [improve, setImprove] = useState<string[]>([]);
  const [recommend, setRecommend] = useState<string[]>([]);
  const [dahiah, setDahiah] = useState<string[]>([]);
  const [from, setFrom] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("قيّم تجربتك أول (من نجمة لخمس).");
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, liked, improve, recommend: recommend[0], dahiah: dahiah[0], from: from[0], note, lang: "ar" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "");
      try { localStorage.setItem(DONE_KEY, new Date().toISOString()); } catch {}
      setState("sent");
      onDone();
    } catch (err: any) {
      setState("idle");
      setError(err?.message || "ما قدرت أرسل رأيك، جرّب مرة ثانية.");
    }
  }

  const label = "mb-2 block text-sm font-bold text-[#3f2a22]";

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="شاركنا رأيك في الموسم"
        onClick={(e) => e.stopPropagation()}
        className="tr-sheet max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[1.8rem] border border-[#e2d5c6] bg-[#fdf9f3] p-4 pb-6 shadow-2xl sm:rounded-[1.8rem]"
      >
        <div className="sadu-strip -mx-4 -mt-4 mb-3 rounded-t-[1.8rem]" />
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#3f2a22]">
            <ClipboardList className="size-5 text-[#a5492a]" />
            شاركنا رأيك في الموسم
          </h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-[#f2e9dd] text-[#7d3a22]" aria-label="إغلاق">
            <X className="size-4" />
          </button>
        </div>

        {state === "sent" ? (
          <div className="py-8 text-center">
            <CircleCheck className="mx-auto size-12 text-emerald-600" />
            <p className="mt-3 text-base font-bold text-[#3f2a22]">الله يعطيك العافية، وصلنا رأيك!</p>
            <p className="mt-1 text-sm text-[#6f5446]">رأيك يساعد الموسم الجاي يصير أحسن.</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-[#a5492a] px-5 py-2 text-sm font-bold text-white">تم</button>
          </div>
        ) : (
          <form onSubmit={send} className="mt-4 space-y-5">
            <div>
              <span className={label}>١. كيف كانت تجربتك في الموسم؟</span>
              <div className="flex justify-center gap-2" role="radiogroup" aria-label="التقييم">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={rating === s} aria-label={`${s} من ٥`} onClick={() => setRating(s)} className="p-1">
                    <Star className={`size-9 transition ${s <= rating ? "fill-[#e0a03a] text-[#e0a03a]" : "text-[#d9c3b0]"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>٢. وش أكثر شي عجبك؟ <span className="text-xs font-medium text-[#6f5446]">(اختر أكثر من وحدة)</span></span>
              <Chips options={Q.liked} value={liked} onChange={setLiked} many />
            </div>
            <div>
              <span className={label}>٣. وش يحتاج تحسين؟ <span className="text-xs font-medium text-[#6f5446]">(اختر أكثر من وحدة)</span></span>
              <Chips options={Q.improve} value={improve} onChange={setImprove} many />
            </div>
            <div>
              <span className={label}>٤. تنصح غيرك يزور الموسم؟</span>
              <Chips options={Q.recommend} value={recommend} onChange={setRecommend} />
            </div>
            <div>
              <span className={label}>٥. ساعدك «الداهية» في زيارتك؟</span>
              <Chips options={Q.dahiah} value={dahiah} onChange={setDahiah} />
            </div>
            <div>
              <span className={label}>٦. من وين جيت؟</span>
              <Chips options={Q.from} value={from} onChange={setFrom} />
            </div>
            <label className="block">
              <span className={label}>ملاحظة أو اقتراح <span className="text-xs font-medium text-[#6f5446]">(اختياري)</span></span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full resize-y rounded-xl border border-[#e2d5c6] bg-[#fbf6ee] px-3 py-2 text-sm leading-6 text-[#3f2a22] outline-none focus:border-[#a5492a]"
              />
            </label>
            {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={state === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a5492a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#86391f] disabled:opacity-70"
            >
              {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : null}
              أرسل رأيي
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
