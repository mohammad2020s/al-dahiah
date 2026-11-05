import React from "react";

// Light formatting for the guide's answers: «**bold**» becomes bold and «* item» / «- item»
// lines become bullets, so model markdown never shows as raw asterisks. Anything else is plain text.
// Web addresses («qasab-tickets.pages.dev», «https://qasabcity.com») become tappable links kept
// left-to-right, so they don't break apart inside Arabic text
const LINK_RE = /((?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:com|dev|sa|org|net|app|gov\.sa)(?:\/[^\s)»،]*[^\s)»،.,!?؟])?)/gi;
function links(text: string, keyBase: string) {
  // Markdown links «[label](url)»: keep the address only (or «label url» when the label is words)
  const flat = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) =>
    /^(?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i.test(label.trim()) ? url : `${label} ${url}`
  );
  const parts = flat.split(LINK_RE);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <a
        key={`${keyBase}-l${i}`}
        href={/^https?:/i.test(p) ? p : `https://${p}`}
        target="_blank"
        rel="noopener noreferrer"
        dir="ltr"
        className="inline-block font-bold underline decoration-[#94532d]/40 underline-offset-2 hover:decoration-[#94532d]"
      >
        {p.replace(/^https?:\/\//i, "")}
      </a>
    ) : (
      <React.Fragment key={`${keyBase}-t${i}`}>{p}</React.Fragment>
    )
  );
}

function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*[^*\n]+\*\*$/.test(p) ? (
      <strong key={`${keyBase}-${i}`} className="font-bold">
        {links(p.slice(2, -2), `${keyBase}-${i}`)}
      </strong>
    ) : (
      // Stray single asterisks or heading hashes left by the model
      <React.Fragment key={`${keyBase}-${i}`}>
        {links(p.replace(/\*\*/g, "").replace(/(^|\s)\*(?=\S)|(?<=\S)\*(\s|$)/g, "$1$2"), `${keyBase}-${i}`)}
      </React.Fragment>
    )
  );
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  // Numbered points the model wrote inline («... مشاهداتنا: ١. أحواض ... ٢. أكوام») go on their own lines
  const lines = text
    .replace(/\r/g, "")
    .replace(/([:.،؛!؟)])[ \t]+([0-9٠-٩]{1,2})[.)][ \t]+(?=\S)/g, "$1\n$2. ")
    // …and so do dash bullets written inline after a colon or full stop («القصب: - الحالة: صافي. - الرياح…»)
    .replace(/([:.،%)])[ \t]+[-•][ \t]+(?=\S)/g, "$1\n- ")
    .split("\n");
  return (
    <div className={className}>
      {lines.map((raw, i) => {
        const line = raw.replace(/^#{1,6}\s+/, "");
        const num = /^\s*([0-9٠-٩]{1,2})[.)]\s+/.exec(line);
        if (num) {
          return (
            <div key={i} className="mt-1 flex gap-2">
              <span className="mt-[0.3em] grid size-5 shrink-0 select-none place-items-center rounded-full bg-[#94532d] text-[11px] font-bold leading-none text-white">
                {num[1]}
              </span>
              <span className="min-w-0">{inline(line.slice(num[0].length), String(i))}</span>
            </div>
          );
        }
        const bullet = /^\s*[*\-•]\s+/.exec(line);
        if (bullet) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-[0.15em] select-none text-[#94532d]">•</span>
              <span className="min-w-0">{inline(line.slice(bullet[0].length), String(i))}</span>
            </div>
          );
        }
        return line.trim() === "" ? (
          <div key={i} className="h-3" />
        ) : (
          <p key={i}>{inline(line, String(i))}</p>
        );
      })}
    </div>
  );
}
