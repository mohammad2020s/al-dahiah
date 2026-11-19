import React, { useEffect, useRef, useState } from "react";
import { Camera, CircleCheck, ImagePlus, Loader2, X } from "lucide-react";

// «لقطات الزوار»: visitors' own photos from the season, shown after the owner approves them (/shots).
type Shot = { id: string; at: string; name?: string; caption?: string };

/** Shrinks a photo in the browser (also drops its GPS/EXIF data): JPEG base64, longest side ≤ max. */
async function shrink(file: File, max: number, quality: number): Promise<string> {
  const bmp = await createImageBitmap(file).catch(async () => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url; });
    return im as unknown as ImageBitmap;
  });
  const w = (bmp as any).width, h = (bmp as any).height;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  c.getContext("2d")!.drawImage(bmp as any, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality).split(",")[1];
}

export function SeasonShots({ en }: { en: boolean }) {
  const [items, setItems] = useState<Shot[]>([]);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Shot | null>(null);

  useEffect(() => {
    fetch("/api/shots").then((r) => r.json()).then((j) => setItems(j.items || [])).catch(() => {});
  }, []);

  return (
    <section className="card-contour heritage-frame rounded-[1.7rem] border border-[#e2d5c6] bg-white/95 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-[#3f2a22]">
            <Camera className="size-5 text-[#a5492a]" />
            {en ? "Visitors' shots" : "لقطات الزوار"}
          </h2>
          <p className="mt-0.5 text-xs text-[#6f5446]">{en ? "Photos from the Salt Season, shared by visitors" : "صور من موسم الملح، من تصوير الزوار"}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#a5492a] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#86391f] active:scale-[0.98]"
        >
          <ImagePlus className="size-4" />
          {en ? "Share your shot" : "شارك لقطتك"}
        </button>
      </div>

      {items.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((s) => (
            <button key={s.id} type="button" onClick={() => setView(s)} className="group relative overflow-hidden rounded-xl bg-[#eadfce]" aria-label={s.caption || (en ? "Visitor's photo" : "صورة زائر")}>
              <img src={`/api/shots/${s.id}/thumb`} alt={s.caption || ""} loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-105" />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-[#fbf6ee] px-3 py-3 text-center text-xs text-[#6f5446]">
          {en ? "No shots yet: be the first to share one from the season!" : "ما فيه لقطات للحين، كن أول من يشارك لقطته من الموسم!"}
        </p>
      )}

      {view && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 p-4" onClick={() => setView(null)} role="dialog" aria-modal="true">
          <button type="button" className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white" aria-label={en ? "Close" : "إغلاق"}>
            <X className="size-5" />
          </button>
          <img src={`/api/shots/${view.id}/full`} alt={view.caption || ""} className="max-h-[80vh] max-w-full rounded-xl object-contain" />
          {(view.caption || view.name) && (
            <p className="mt-3 max-w-md text-center text-sm text-white/90">
              {view.caption}
              {view.name ? <span className="block text-xs text-white/60">{en ? "Photo: " : "تصوير: "}{view.name}</span> : null}
            </p>
          )}
        </div>
      )}

      {open && <ShareSheet en={en} onClose={() => setOpen(false)} />}
    </section>
  );
}

function ShareSheet({ en, onClose }: { en: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f?: File | null) {
    setError("");
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError(en ? "Please choose a photo." : "اختر صورة."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError(en ? "Choose a photo first." : "اختر صورة أول.");
    if (!consent) return setError(en ? "Please confirm the photo is yours." : "أكّد إن الصورة لك وتوافق تنعرض.");
    setState("sending");
    setError("");
    try {
      const [full, thumb] = await Promise.all([shrink(file, 1600, 0.82), shrink(file, 480, 0.75)]);
      const r = await fetch("/api/shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full, thumb, name, caption, consent, lang: en ? "en" : "ar" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "");
      setState("sent");
    } catch (err: any) {
      setState("idle");
      setError(err?.message || (en ? "Couldn't send it, please try again." : "ما قدرت أرسلها، جرّب مرة ثانية."));
    }
  }

  const field = "w-full rounded-xl border border-[#e2d5c6] bg-[#fbf6ee] px-3 py-2 text-sm text-[#3f2a22] outline-none focus:border-[#a5492a]";

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        dir={en ? "ltr" : "rtl"}
        role="dialog"
        aria-modal="true"
        aria-label={en ? "Share your shot" : "شارك لقطتك"}
        onClick={(e) => e.stopPropagation()}
        className="tr-sheet max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[1.8rem] border border-[#e2d5c6] bg-[#fdf9f3] p-4 pb-6 shadow-2xl sm:rounded-[1.8rem]"
      >
        <div className="sadu-strip -mx-4 -mt-4 mb-3 rounded-t-[1.8rem]" />
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#3f2a22]">
            <Camera className="size-5 text-[#a5492a]" />
            {en ? "Share your shot" : "شارك لقطتك من الموسم"}
          </h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full bg-[#f2e9dd] text-[#7d3a22]" aria-label={en ? "Close" : "إغلاق"}>
            <X className="size-4" />
          </button>
        </div>

        {state === "sent" ? (
          <div className="py-8 text-center">
            <CircleCheck className="mx-auto size-12 text-emerald-600" />
            <p className="mt-3 text-base font-bold text-[#3f2a22]">{en ? "Thanks! Your shot was sent." : "الله يعطيك العافية، وصلت لقطتك!"}</p>
            <p className="mt-1 text-sm text-[#6f5446]">{en ? "It will appear in the gallery once it's approved." : "بتطلع في معرض اللقطات بعد ما يوافق عليها صاحب الموقع."}</p>
            <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-[#a5492a] px-5 py-2 text-sm font-bold text-white">
              {en ? "Done" : "تم"}
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="mt-3 space-y-3">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-[#d9c3b0] bg-[#fbf6ee] p-3 text-sm font-semibold text-[#7d3a22]"
            >
              {preview ? (
                <img src={preview} alt="" className="max-h-56 rounded-xl object-contain" />
              ) : (
                <>
                  <ImagePlus className="size-8 text-[#a5492a]" />
                  {en ? "Take or choose a photo" : "صوّر أو اختر صورة"}
                </>
              )}
            </button>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#694a3f]">{en ? "A short caption (optional)" : "وصف قصير (اختياري)"}</span>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#694a3f]">{en ? "Your name, shown with the photo (optional)" : "اسمك يطلع مع الصورة (اختياري)"}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={field} />
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-[#3f2a22]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[#a5492a]" />
              <span>{en ? "I took this photo, and I agree to it being shown on Al-Dahiya's site." : "أنا اللي صوّرت هالصورة، وأوافق إنها تنعرض في موقع الداهية."}</span>
            </label>
            {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={state === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a5492a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#86391f] disabled:opacity-70"
            >
              {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {en ? "Send" : "أرسل"}
            </button>
            <p className="text-center text-[11px] text-[#6f5446]">{en ? "Shown after approval. Location data is removed from the photo." : "تطلع بعد الموافقة عليها، ونشيل من الصورة معلومات الموقع."}</p>
          </form>
        )}
      </div>
    </div>
  );
}
