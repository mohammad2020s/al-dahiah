// "Ask next" chips under each answer. Rule-based (no Gemini quota) and only questions the
// guide can really answer, so tapping one never ends in «ما عندي معلومة».
import { matchPlaceTopic } from "./alQasabKnowledge.ts";

type Pair = [ar: string, en: string];

export const BY_TOPIC: Record<string, Pair[]> = {
  salt_pans: [
    ["كيف يستخرجون الملح؟", "How is the salt made?"],
    ["وش الفرق بين مملحة القصب ومملحة المقحم؟", "How is Al-Muqhim different from the Al-Qasab salt pans?"],
    ["وش أحسن وقت أزور فيه المملحة؟", "When is the best time to visit the salt pans?"],
    ["كيف أوصل للممالح؟", "How do I get to the salt pans?"],
  ],
  heritage_places: [
    ["علمني عن قصر الزاحم", "Tell me about Al-Zahim palace"],
    ["وش سوق العبيدي؟", "What is Souq Al-Obaidi?"],
    ["وين الأماكن التراثية على الخريطة؟", "Where are the heritage places on the map?"],
  ],
  tourist_places: [
    ["حدثني عن مملحة القصب", "Tell me about the Al-Qasab salt pans"],
    ["وش الفرق بين مملحة القصب ومملحة المقحم؟", "How is Al-Muqhim different from the Al-Qasab salt pans?"],
    ["وش قصة الصبخة؟", "What is Al-Sabkha?"],
  ],
  muqhim_pan: [
    ["حدثني عن مملحة القصب", "Tell me about the Al-Qasab salt pans"],
    ["وين مملحة المقحم على الخريطة؟", "Where is Al-Muqhim salt pan on the map?"],
    ["وش أحسن وقت أزور فيه المملحة؟", "When is the best time to visit the salt pans?"],
  ],
  sabkha: [
    ["وين الصبخة على الخريطة؟", "Where is Al-Sabkha on the map?"],
    ["حدثني عن ممالح القصب", "Tell me about the Al-Qasab salt pans"],
    ["كيف الطقس الحين؟", "What's the weather now?"],
  ],
  zahim_palace: [
    ["وين قصر الزاحم على الخريطة؟", "Where is Al-Zahim palace on the map?"],
    ["وش سوق العبيدي؟", "What is Souq Al-Obaidi?"],
    ["علمني عن البلدة القديمة", "Tell me about the old town"],
  ],
  obaidi_souq: [
    ["وش مبنى القصبي التراثي؟", "What is the Al-Qusaibi heritage building?"],
    ["علمني عن قصر الزاحم", "Tell me about Al-Zahim palace"],
    ["وين سوق العبيدي على الخريطة؟", "Where is Souq Al-Obaidi on the map?"],
  ],
  qusaibi_building: [
    ["وش سوق العبيدي؟", "What is Souq Al-Obaidi?"],
    ["وش قصة منزل الراشد؟", "What's the story of the Al-Rashid house?"],
    ["علمني عن قصر الزاحم", "Tell me about Al-Zahim palace"],
  ],
  rashid_house: [
    ["وش قصة المرقب؟", "What's the story of the watchtower?"],
    ["وش قصة أبواب القصب؟", "What's the story of Al-Qasab's gates?"],
    ["وش سوق العبيدي؟", "What is Souq Al-Obaidi?"],
  ],
  old_town: [
    ["علمني عن قصر الزاحم", "Tell me about Al-Zahim palace"],
    ["وش سوق العبيدي؟", "What is Souq Al-Obaidi?"],
    ["أبرز المقاهي في القرية التراثية؟", "Which heritage cafes are nearby?"],
  ],
  marqab: [
    ["وش أحسن وقت أطلع فيه المرقب؟", "When is the best time to climb the watchtower?"],
    ["علمني عن البلدة القديمة", "Tell me about the old town"],
    ["وش قصة الصبخة؟", "What is Al-Sabkha?"],
  ],
  season: [
    ["وش محطات الموسم؟", "What are the season's stations?"],
    ["كيف أحصل على تذكرة؟", "How do I get a ticket?"],
    ["وين أرض الفعاليات على الخريطة؟", "Where are the event grounds on the map?"],
    ["حدثني عن ممالح القصب", "Tell me about the Al-Qasab salt pans"],
  ],
  mosques: [
    ["وين أقرب دورات مياه؟", "Where are the nearest restrooms?"],
    ["علمني عن القرية التراثية", "Tell me about the heritage village"],
    ["وش الموقع الرسمي للقصب؟", "What is Al-Qasab's official website?"],
  ],
  restrooms: [
    ["وين المساجد في القصب؟", "Where are the mosques in Al-Qasab?"],
    ["وش محطات الموسم؟", "What are the season's stations?"],
    ["علمني عن روضة العكرشية", "Tell me about Rawdat Al-Akrashiya"],
  ],
  official_site: [
    ["وش الأماكن السياحية في القصب؟", "What are the tourist places in Al-Qasab?"],
    ["وش فعاليات القصب على مدار السنة؟", "What events does Al-Qasab hold through the year?"],
    ["كيف أحصل على تذكرة؟", "How do I get a ticket?"],
  ],
  events: [
    ["علمني عن حديقة الملك سلمان", "Tell me about King Salman Park"],
    ["متى موسم الملح؟", "When is the Salt Season?"],
    ["وش الموقع الرسمي للقصب؟", "What is Al-Qasab's official website?"],
  ],
  king_salman_park: [
    ["وش فعاليات القصب على مدار السنة؟", "What events does Al-Qasab hold through the year?"],
    ["وين المساجد في القصب؟", "Where are the mosques in Al-Qasab?"],
    ["علمني عن القرية التراثية", "Tell me about the heritage village"],
  ],
  art_club: [
    ["وش سوق العبيدي؟", "What is Souq Al-Obaidi?"],
    ["علمني عن القرية التراثية", "Tell me about the heritage village"],
    ["وين أقرب دورات مياه؟", "Where are the nearest restrooms?"],
  ],
  burdan_lake: [
    ["علمني عن روضة العكرشية", "Tell me about Rawdat Al-Akrashiya"],
    ["وش النفود وجبل الفهدة؟", "What are the Nafud and Jabal Al-Fahda?"],
    ["كيف الطقس الحين؟", "What's the weather now?"],
  ],
  nafud: [
    ["وين الواحة الخضراء؟", "Where is the Green Oasis?"],
    ["علمني عن منتزه الشفيعي", "Tell me about Al-Shafei park"],
    ["كيف الطقس الحين؟", "What's the weather now?"],
  ],
  shafei_park: [
    ["وش النفود وجبل الفهدة؟", "What are the Nafud and Jabal Al-Fahda?"],
    ["علمني عن روضة العكرشية", "Tell me about Rawdat Al-Akrashiya"],
    ["كيف الطقس الحين؟", "What's the weather now?"],
  ],
  birds_museum: [
    ["علمني عن روضة العكرشية", "Tell me about Rawdat Al-Akrashiya"],
    ["وش الأماكن السياحية في القصب؟", "What are the tourist places in Al-Qasab?"],
    ["وش الموقع الرسمي للقصب؟", "What is Al-Qasab's official website?"],
  ],
  season_map: [
    ["كيف أحصل على تذكرة؟", "How do I get a ticket?"],
    ["وش قصة أبواب القصب؟", "What's the story of Al-Qasab's gates?"],
    ["حدثني عن شعر القصب", "Tell me about Al-Qasab's poetry"],
  ],
  salt_extraction: [
    ["كم تنتج القصب من الملح؟", "How much salt does Al-Qasab produce?"],
    ["حدثني عن ممالح القصب", "Tell me about the Al-Qasab salt pans"],
    ["وش تاريخ الملح؟", "What's the history of salt?"],
  ],
  salt_economy: [
    ["كيف يستخرجون الملح؟", "How is the salt made?"],
    ["وش تاريخ الملح؟", "What's the history of salt?"],
    ["متى موسم الملح؟", "When is the Salt Season?"],
  ],
  salt_history: [
    ["كيف يستخرجون الملح؟", "How is the salt made?"],
    ["وش تاريخ القصب؟", "What's the history of Al-Qasab?"],
    ["كم تنتج القصب من الملح؟", "How much salt does Al-Qasab produce?"],
  ],
  qasab_history: [
    ["وش قصة أبواب القصب؟", "What's the story of Al-Qasab's gates?"],
    ["حدثني عن شعر القصب", "Tell me about Al-Qasab's poetry"],
    ["وش قصة المرقب؟", "What's the story of the watchtower?"],
  ],
  gates: [
    ["وش قصة المرقب؟", "What's the story of the watchtower?"],
    ["وش تاريخ القصب؟", "What's the history of Al-Qasab?"],
    ["علمني عن البلدة القديمة", "Tell me about the old town"],
  ],
  qarraya: [
    ["وش تاريخ القصب؟", "What's the history of Al-Qasab?"],
    ["وش محطات الموسم؟", "What are the season's stations?"],
    ["حدثني عن شعر القصب", "Tell me about Al-Qasab's poetry"],
  ],
  akrashiya: [
    ["وين الواحة الخضراء؟", "Where is the Green Oasis?"],
    ["كيف الطقس الحين؟", "What's the weather now?"],
    ["حدثني عن ممالح القصب", "Tell me about the Al-Qasab salt pans"],
  ],
  poetry: [
    ["وش أمثال القصب الشعبية؟", "What are Al-Qasab's folk proverbs?"],
    ["وش تاريخ القصب؟", "What's the history of Al-Qasab?"],
    ["وش محطات الموسم؟", "What are the season's stations?"],
  ],
  proverbs: [
    ["حدثني عن شعر القصب", "Tell me about Al-Qasab's poetry"],
    ["وش تاريخ الملح؟", "What's the history of salt?"],
    ["وش قصة أبواب القصب؟", "What's the story of Al-Qasab's gates?"],
  ],
  town: [
    ["وش تاريخ القصب؟", "What's the history of Al-Qasab?"],
    ["حدثني عن ممالح القصب", "Tell me about the Al-Qasab salt pans"],
    ["متى موسم الملح؟", "When is the Salt Season?"],
  ],
  cafes: [
    ["وين قهوة بدور؟", "Where is Bdor Coffee?"],
    ["وين شاهي ناقع؟", "Where is Shahi Nagea?"],
    ["علمني عن البلدة القديمة", "Tell me about the old town"],
  ],
  weather: [
    ["وش أحسن وقت أزور القصب؟", "When is the best time to visit Al-Qasab?"],
    ["وش قصة الصبخة؟", "What is Al-Sabkha?"],
    ["متى موسم الملح؟", "When is the Salt Season?"],
  ],
  tickets: [
    ["وش محطات الموسم؟", "What are the season's stations?"],
    ["وين أرض الفعاليات على الخريطة؟", "Where are the event grounds on the map?"],
    ["أبرز المقاهي في القصب؟", "What are the cafes in Al-Qasab?"],
  ],
  photo: [
    ["علمني عن البلدة القديمة", "Tell me about the old town"],
    ["حدثني عن ممالح القصب", "Tell me about the Al-Qasab salt pans"],
    ["علمني عن قصر الزاحم", "Tell me about Al-Zahim palace"],
  ],
  other: [
    ["وش ممالح القصب؟ وريني صورها", "What are the Al-Qasab salt pans? Show me photos"],
    ["متى موسم الملح؟", "When is the Salt Season?"],
    ["أبرز المقاهي في القصب؟", "What are the cafes in Al-Qasab?"],
  ],
};

const norm = (s: string) =>
  (s || "")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[؟?!.,،]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const CAFE = ["قهوه", "كافيه", "مقهي", "مقاهي", "كوفي", "بدور", "ناقع", "شاهي", "ديوانيه", "cafe", "coffee"];
const WEATHER = ["طقس", "الجو", "حراره", "مطر", "weather", "temperature"];
const TICKETS = ["تذكر", "تذاكر", "سعر الدخول", "رسوم", "ticket"];

/** Topic of a question (or of the answer, for photo questions). */
export function followUpTopic(text: string): string {
  const n = norm(text);
  if (TICKETS.some((w) => n.includes(w))) return "tickets";
  const t = matchPlaceTopic(text);
  if (t) return t.id;
  if (CAFE.some((w) => n.includes(w))) return "cafes";
  if (WEATHER.some((w) => n.includes(w))) return "weather";
  return "other";
}

/** Up to 3 next questions; never the one just asked. */
export function getFollowUps(question: string, lang: "ar" | "en", topic?: string): string[] {
  const key = topic || followUpTopic(question);
  const asked = norm(question);
  // Same kind of question about the same topic («متى موسم الملح» → «متى يبدأ الموسم») adds nothing
  const intent = (q: string) => /^(متي|وين|كم|كيف|when|where|how)(?=\s|$)/.exec(norm(q))?.[1] || "";
  const askedIntent = intent(question);
  return (BY_TOPIC[key] || BY_TOPIC.other)
    .map(([ar, en]) => (lang === "en" ? en : ar))
    .filter((q) => {
      const n = norm(q);
      if (n === asked || asked.includes(n) || (asked && n.includes(asked))) return false;
      return !(askedIntent && intent(q) === askedIntent);
    })
    .slice(0, 3);
}
