import React, { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import type { Language } from "../i18n";

// Short facts from the official Salt Season file, changing every few seconds; tap one to ask more
const FACTS: { ar: string; en: string; askAr: string; askEn: string }[] = [
  { ar: "مملحة القَصَب مساحتها قرابة ٥٠ كيلو متر مربع، طولها ١١ كيلو وعرضها ٤.", en: "The Al-Qasab salt pans cover about 50 km², 11 km long and 4 km wide.", askAr: "حدثني عن ممالح القصب", askEn: "Tell me about the Al-Qasab salt pans" },
  { ar: "القَصَب تغطي قرابة ثلث احتياج السوق السعودي من ملح الطعام.", en: "Al-Qasab covers about a third of the Saudi market's table-salt needs.", askAr: "كم تنتج القصب من الملح؟", askEn: "How much salt does Al-Qasab produce?" },
  { ar: "الملح يتكوّن في برك الجِفار خلال شهرين إلى أربعة شهور حسب الحرارة والهوا.", en: "Salt forms in the Al-Jifar pools in two to four months, depending on heat and wind.", askAr: "كيف يستخرجون الملح؟", askEn: "How is the salt made?" },
  { ar: "الهمداني ذكر «ملح القُصَيبة» قبل أكثر من ألف سنة في «صفة جزيرة العرب».", en: "Al-Hamdani mentioned «the salt of Al-Qusaiba» over a thousand years ago.", askAr: "وش تاريخ الملح؟", askEn: "What's the history of salt?" },
  { ar: "«يوم القُصَيبات» من أيام حرب البسوس، وجزم الهمداني إنه صار في القَصَب.", en: "«The Day of Al-Qusaibat» in the War of Al-Basus took place at Al-Qasab, per al-Hamdani.", askAr: "وش تاريخ القصب؟", askEn: "What's the history of Al-Qasab?" },
  { ar: "مرقب القَصَب برج طيني طوله قرابة ١٠ أمتار، يصعده «الرقيب» من الصبح للمغرب.", en: "The Al-Qasab watchtower is about 10 m tall; the lookout climbed it from dawn to dusk.", askAr: "وش قصة المرقب؟", askEn: "What's the story of the watchtower?" },
  { ar: "القَصَب بلاد الشعر والملح، ومن أشهر شعرائها حميدان الشويعر.", en: "Al-Qasab is the land of salt and poetry; Humaidan Al-Shuwai'ir is its most famous poet.", askAr: "حدثني عن شعر القصب", askEn: "Tell me about Al-Qasab's poetry" },
  { ar: "من أمثال القَصَب: «كمن أهدى الملح على أهل القَصَب».", en: "An Al-Qasab proverb: «Like giving salt as a gift to the people of Al-Qasab».", askAr: "وش أمثال القصب الشعبية؟", askEn: "What are Al-Qasab's folk proverbs?" },
  { ar: "للقَصَب أبواب قديمة منها باب الحوطة وباب المُجَيبيب وباب البرج.", en: "Al-Qasab's old gates include Bab Al-Hawta, Bab Al-Mujaibib and Bab Al-Burj.", askAr: "وش قصة أبواب القصب؟", askEn: "What's the story of Al-Qasab's gates?" },
  { ar: "الصْبَخَة في ليالي الصيف أبرد من اللي حولها بخمس إلى عشر درجات.", en: "On summer nights Al-Sabkha is 5–10°C cooler than its surroundings.", askAr: "وش قصة الصبخة؟", askEn: "What is Al-Sabkha?" },
  { ar: "روضة العكرشية من أكبر رياض نجد، ماها بعد السيل ينتشر على ١٢ مليون متر مربع.", en: "Rawdat Al-Akrashiya is among Najd's largest meadows: after rain, water spreads over 12 million m².", askAr: "علمني عن روضة العكرشية", askEn: "Tell me about Rawdat Al-Akrashiya" },
  { ar: "النسخة الثالثة من موسم ملح القَصَب استقبلت فوق ١٠٠ ألف زائر.", en: "The third Salt Season welcomed over 100,000 visitors.", askAr: "عرفني بموسم ملح القصب", askEn: "Tell me about the Salt Season" },
];

export function DidYouKnow({ language = "ar", onAsk }: { language?: Language; onAsk?: (q: string) => void }) {
  const en = language === "en";
  const [i, setI] = useState(() => Math.floor(Math.random() * FACTS.length));
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % FACTS.length), 9000);
    return () => clearInterval(id);
  }, []);
  const f = FACTS[i];
  return (
    <button
      type="button"
      onClick={() => onAsk?.(en ? f.askEn : f.askAr)}
      className="group block w-full overflow-hidden rounded-[1.7rem] border border-[#e6d5bd] bg-white/95 p-4 text-start shadow-sm backdrop-blur transition hover:shadow-md"
    >
      <span className="flex items-center gap-1.5 text-xs font-bold text-[#3a2a1c]">
        <Lightbulb className="size-4 text-[#c08a3e]" />
        {en ? "Did you know?" : "هل تعلم؟"}
      </span>
      <p key={i} className="dyk-fade mt-2 min-h-[3.2rem] text-[13px] leading-6 text-[#584535]">
        {en ? f.en : f.ar}
      </p>
      <span className="mt-1 inline-block text-[11px] font-bold text-[#94532d] group-hover:underline">
        {en ? "Tell me more ›" : "‹ علمني أكثر"}
      </span>
    </button>
  );
}
