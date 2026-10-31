import React from "react";

// Light formatting for the guide's answers: «**bold**» becomes bold and «* item» / «- item»
// lines become bullets, so model markdown never shows as raw asterisks. Anything else is plain text.
function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*[^*\n]+\*\*$/.test(p) ? (
      <strong key={`${keyBase}-${i}`} className="font-bold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      // Stray single asterisks or heading hashes left by the model
      <React.Fragment key={`${keyBase}-${i}`}>{p.replace(/\*\*/g, "").replace(/(^|\s)\*(?=\S)|(?<=\S)\*(\s|$)/g, "$1$2")}</React.Fragment>
    )
  );
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  // Numbered points the model wrote inline («... مشاهداتنا: ١. أحواض ... ٢. أكوام») go on their own lines
  const lines = text
    .replace(/\r/g, "")
    .replace(/([^\n])[ \t]+([0-9٠-٩]{1,2})[.)][ \t]+(?=\S)/g, "$1\n$2. ")
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
