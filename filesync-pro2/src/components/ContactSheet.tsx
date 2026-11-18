import React, { useEffect, useState } from "react";
import { CircleCheck, Loader2, Mail, Send, X } from "lucide-react";

// «راسلني»: a visitor writes to the site's maker from inside the site. The message goes to the server
// (/api/contact), which keeps it and emails it on: the maker's address is never shown on the page.
export function ContactSheet({ en, onClose }: { en: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // stays empty for people (bots fill it)
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    if (message.trim().length < 3) {
      setError(en ? "Please write your message." : "اكتب رسالتك أول.");
      return;
    }
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message, website, lang: en ? "en" : "ar" }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "");
      setState("sent");
    } catch (err: any) {
      setState("idle");
      setError(err?.message || (en ? "Couldn't send it, please try again." : "ما قدرت أرسلها، جرّب مرة ثانية."));
    }
  }

  const field = "w-full rounded-xl border border-[#e2d5c6] bg-[#fbf6ee] px-3 py-2 text-sm text-[#3f2a22] outline-none transition focus:border-[#a5492a]";

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        dir={en ? "ltr" : "rtl"}
        role="dialog"
        aria-modal="true"
        aria-label={en ? "Message me" : "راسلني"}
        onClick={(e) => e.stopPropagation()}
        className="tr-sheet max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[1.8rem] border border-[#e2d5c6] bg-[#fdf9f3] p-4 pb-6 shadow-2xl sm:rounded-[1.8rem]"
      >
        <div className="sadu-strip -mx-4 -mt-4 mb-3 rounded-t-[1.8rem]" />
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#3f2a22]">
            <Mail className="size-5 text-[#a5492a]" />
            {en ? "Message Mohammed" : "راسل محمد"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-[#f2e9dd] text-[#7d3a22] hover:bg-[#ead9c6]"
            aria-label={en ? "Close" : "إغلاق"}
          >
            <X className="size-4" />
          </button>
        </div>

        {state === "sent" ? (
          <div className="py-8 text-center">
            <CircleCheck className="mx-auto size-12 text-emerald-600" />
            <p className="mt-3 text-base font-bold text-[#3f2a22]">{en ? "Your message was sent, thank you!" : "وصلت رسالتك، الله يعطيك العافية!"}</p>
            {contact.trim() ? (
              <p className="mt-1 text-sm text-[#85695a]">{en ? "He'll reply to you as soon as he can." : "بيرد عليك أول ما يقدر."}</p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="mt-5 rounded-xl bg-[#a5492a] px-5 py-2 text-sm font-bold text-white hover:bg-[#86391f]"
            >
              {en ? "Done" : "تم"}
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="mt-3 space-y-3">
            <p className="text-[13px] leading-6 text-[#85695a]">
              {en ? "Ideas, a mistake you spotted, or just hello: it reaches him directly." : "فكرة، ملاحظة، غلط شفته، أو حتى سلام: توصله مباشرة."}
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#694a3f]">{en ? "Your name (optional)" : "اسمك (اختياري)"}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#694a3f]">
                {en ? "Your email or phone, so he can reply (optional)" : "إيميلك أو جوالك عشان يرد عليك (اختياري)"}
              </span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} dir="ltr" autoComplete="email" className={`${field} text-start`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#694a3f]">{en ? "Your message" : "رسالتك"}</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={5}
                required
                className={`${field} resize-y leading-6`}
              />
            </label>
            {/* Left empty by people; hidden from view and from screen readers */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={state === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a5492a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#86391f] active:scale-[0.99] disabled:opacity-70"
            >
              {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Send className={`size-4 ${en ? "" : "rotate-180"}`} />}
              {en ? "Send" : "أرسل"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
