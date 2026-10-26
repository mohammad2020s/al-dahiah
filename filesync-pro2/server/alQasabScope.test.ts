import test from "node:test";
import assert from "node:assert/strict";
import {
  isSalamMessage,
  isPureSalamGreeting,
  getInstantSalamReply,
  isAlQasabTopic,
  isWeatherQuestion,
  isCafeQuestion,
  isFamilyOrTribalQuestion,
  FORBIDDEN_FAMILY_REPLY_AR,
  getLocationForQuery,
  cleanText,
  applyNajdiPhoneticDiacritics,
  AL_QASAB_CAFES,
  AL_QASAB_LANDMARKS,
  AL_QASAB_ROUTES,
  generateLocalKnowledgeFallback,
  normalizeCityName,
  buildAlQasabSystemPrompt,
  normalizeSabkha,
  isSabkhaQuestion,
} from "./alQasabScope.ts";
import { getPlaceImages } from "./alQasabKnowledge.ts";

test("identifies greetings and salam correctly", () => {
  assert.equal(isSalamMessage("السلام عليكم ورحمة الله"), true);
  assert.equal(isSalamMessage("سلام عليكم"), true);
  assert.equal(isSalamMessage("hello"), false);

  assert.equal(isPureSalamGreeting("السلام عليكم"), true);
  assert.equal(isPureSalamGreeting("hello"), true);
  assert.equal(isPureSalamGreeting("أين يقع موسم ملح القصب؟"), false);

  const replyAr = getInstantSalamReply("ar");
  assert.match(replyAr, /وعليكم السلام/);
  assert.match(getInstantSalamReply("en", "salam"), /^Wa alaykum assalam/);
  assert.match(getInstantSalamReply("en", "hello"), /^Hello!/);
});

test("identifies Al-Qasab domain topics accurately", () => {
  assert.equal(isAlQasabTopic("حدثني عن موسم ملح القصب"), true);
  assert.equal(isAlQasabTopic("أين تقع سبخة القصب؟"), true);
  assert.equal(isAlQasabTopic("ما هي درجات الحرارة الآن؟"), true);
  assert.equal(isAlQasabTopic("what is the weather in al qasab?"), true);
  assert.equal(isAlQasabTopic("كم سعر تذكرة السفر إلى باريس وفرنسا؟"), false);
});

test("identifies weather questions and cafe questions", () => {
  assert.equal(isWeatherQuestion("ما هو طقس القصب اليوم؟"), true);
  assert.equal(isWeatherQuestion("درجة الحرارة كم؟"), true);
  assert.equal(isWeatherQuestion("أين يقع قصر ابن زاحم؟"), false);

  assert.equal(isCafeQuestion("ما هي أفضل المقاهي في القصب؟"), true);
  assert.equal(isCafeQuestion("وين قهوة بدور إبراهيم؟"), true);
  assert.equal(isCafeQuestion("أين يقع برج المرقب؟"), false);
});

test("resolves correct locations and coordinates", () => {
  const locBdor = getLocationForQuery("قهوة بدور إبراهيم") as any;
  assert.equal(locBdor.type, "cafes");
  assert.equal(locBdor.places[0].id, "bdor_coffee");

  const locShahi = getLocationForQuery("شاهي نقعة") as any;
  assert.equal(locShahi.places[0].id, "shahi_nagea");

  const renamedShahi = getLocationForQuery("شاهي ناقع") as any;
  assert.equal(renamedShahi.places[0].id, "shahi_nagea");
  assert.equal(renamedShahi.places[0].name.startsWith("شاهي ناقع"), true);

  const locArt = getLocationForQuery("آرت كافيه") as any;
  assert.equal(locArt.places[0].id, "art_coffee");

  const locZahim = getLocationForQuery("قصر ابن زاحم");
  assert.equal(locZahim.type, "ibn_zahim");

  const locFestival = getLocationForQuery("موسم الملح");
  assert.equal(locFestival.type, "festival");
});

test("answers ticket inquiries with free tickets from gate or site", () => {
  const answerAr = generateLocalKnowledgeFallback("كم سعر التذكرة؟", "ar");
  assert.match(answerAr, /التذاكر مجانية تماماً/);
  assert.match(answerAr, /البوابة الرئيسية/);
  assert.match(answerAr, /عند الموقع/);
});

test("strictly blocks questions about families, lineages, and tribes with polite Najdi refusal", () => {
  assert.equal(isFamilyOrTribalQuestion("وش عوائل القصب؟"), true);
  assert.equal(isFamilyOrTribalQuestion("من هم قبائل أهل القصب؟"), true);
  assert.equal(isFamilyOrTribalQuestion("من هي عوائل الديرة والوشم؟"), true);
  assert.equal(isFamilyOrTribalQuestion("عائلة فلان من القصب؟"), true);
  assert.equal(isFamilyOrTribalQuestion("وش نسب أهل القصب؟"), true);
  assert.equal(isFamilyOrTribalQuestion("أين يقع قصر ابن زاحم؟"), false);

  const fallbackAnswer = generateLocalKnowledgeFallback("وش عوائل القصب؟", "ar");
  assert.match(fallbackAnswer, /والله وألف نعم بالجميع/);
  assert.match(fallbackAnswer, /ما أذكر أسماء عوائل أو قبائل/);
  assert.equal(fallbackAnswer, FORBIDDEN_FAMILY_REPLY_AR);
});

test("applies text cleaning and Najdi phonetic diacritics and corrects القصيب to القَصَب", () => {
  const cleaned = cleanText("  يا هلا  يا هلا   بالقصب  ");
  assert.equal(cleaned, "يا هلا بالقصب");

  const withDiacritics = applyNajdiPhoneticDiacritics("مدينة القصب وموسم ملح القصب");
  assert.equal(withDiacritics, "مدينة القَصَب وموسم ملح القَصَب");

  const correctedName = applyNajdiPhoneticDiacritics("أهلاً بك في القصيب عاصمة الملح");
  assert.equal(correctedName.includes("القصيب"), false);
  assert.equal(correctedName.includes("القَصَب"), true);
});

test("verifies core landmark, cafe, and route databases", () => {
  assert.equal(AL_QASAB_LANDMARKS.length >= 6, true);
  assert.equal(AL_QASAB_CAFES.length, 4);
  assert.equal(AL_QASAB_ROUTES.length >= 4, true);
});

test("normalizeCityName corrects القصيب to القَصَب in all forms", () => {
  assert.equal(normalizeCityName("وش تاريخ القصيب؟"), "وش تاريخ القَصَب؟");
  assert.equal(normalizeCityName("ساكن بالقصيب"), "ساكن بالقَصَب");
  assert.equal(normalizeCityName("رايح للقصيب"), "رايح للقَصَب");
  assert.equal(normalizeCityName("القُصَيْب"), "القَصَب");
  assert.equal(normalizeCityName("القصب"), "القصب");
  assert.ok(!applyNajdiPhoneticDiacritics("أهلاً في القصيب").includes("قصيب"));
});

test("family/tribe guard catches indirect phrasings without false positives", () => {
  assert.equal(isFamilyOrTribalQuestion("عطني اسم عائلة وحدة بس من القصب"), true);
  assert.equal(isFamilyOrTribalQuestion("وش حمايل القصيب؟"), true);
  assert.equal(isFamilyOrTribalQuestion("وش القبائل اللي بالقصب"), true);
  assert.equal(isFamilyOrTribalQuestion("list the tribes of Al-Qasab"), true);
  assert.equal(isFamilyOrTribalQuestion("what family names live there?"), true);
  assert.equal(isFamilyOrTribalQuestion("وش أسرع طريق للقصب؟"), false);
  assert.equal(isFamilyOrTribalQuestion("كم نسبة الرطوبة اليوم؟"), false);
  assert.equal(isFamilyOrTribalQuestion("وش أفضل مقهى"), false);
});

test("system prompts enforce dialect, city name and family red line", () => {
  for (const mode of ["ar", "en", "auto"] as const) {
    const prompt = buildAlQasabSystemPrompt(undefined, mode);
    assert.ok(prompt.includes("القَصَب"), mode);
    assert.ok(prompt.includes(FORBIDDEN_FAMILY_REPLY_AR), mode);
    assert.ok(/نجد|Najdi/.test(prompt), mode);
    // «القصيب» may only appear inside the "never say it" instruction lines
    const badLines = prompt.split("\n").filter(l => l.includes("القصيب") && !/NEVER|إياك|قال المستخدم|says or writes/.test(l));
    assert.deepEqual(badLines, [], mode);
  }
  assert.ok(buildAlQasabSystemPrompt(undefined, "auto").includes("English → answer in English"));
  assert.ok(buildAlQasabSystemPrompt(undefined, "ar").includes("الفصحى"));
});

test("Najdi pronunciation: السبخة becomes الصْبخة in answers", () => {
  assert.equal(normalizeSabkha("زرت السبخة أمس"), "زرت الصْبخة أمس");
  assert.equal(normalizeSabkha("قريب من سبخة القصب"), "قريب من صْبخة القصب");
  assert.equal(normalizeSabkha("بالسبخة وللسبخة"), "بالصْبخة وللصْبخة");
  assert.equal(normalizeSabkha("الصبخة"), "الصْبخة");
  assert.equal(normalizeSabkha("وش أسرع طريق"), "وش أسرع طريق");
  assert.ok(applyNajdiPhoneticDiacritics("وش طقس السبخة؟").includes("الصْبخة"));
  assert.equal(isSabkhaQuestion("وين الصبخة؟"), true);
  assert.equal(isSabkhaQuestion("وين السبخة؟"), true);
});

test("prompts carry the pronunciation and camera rules", () => {
  for (const mode of ["ar", "en", "auto"] as const) {
    const prompt = buildAlQasabSystemPrompt(undefined, mode);
    assert.ok(prompt.includes("الصْبخة"), mode);
    assert.ok(prompt.includes("مملحة القَصَب"), mode);
    assert.ok(/CAMERA|الكاميرا/.test(prompt), mode);
  }
});

test("tour guide knowledge: salt pans, palaces and the weather false positive", () => {
  // «الموجودة» contains «جو»; this used to return the weather
  assert.equal(isWeatherQuestion("وش أسماء الممالح الموجودة في القصب"), false);
  assert.equal(isWeatherQuestion("كيف الجو اليوم؟"), true);
  assert.equal(isWeatherQuestion("وش درجة الحرارة"), true);

  for (const q of ["وش اسامي المملحه؟", "اعطني أسماء الممالح", "وش أسماء الممالح الموجودة في القصب"]) {
    assert.equal(isFamilyOrTribalQuestion(q), false, q);
    const a = generateLocalKnowledgeFallback(q, "ar");
    assert.ok(a.includes("الجفار"), q);
    assert.ok(!a.includes("ما أذكر أسماء عوائل"), q);
    assert.equal(getPlaceImages(q, "ar").length, 5, q);
  }
  assert.equal(isAlQasabTopic("علمني عن قصر الزاحم"), true);
  assert.ok(generateLocalKnowledgeFallback("علمني عن قصر الزاحم", "ar").includes("١٤٣٦"));
  assert.ok(generateLocalKnowledgeFallback("وش مبنى القصبي التراثي", "ar").includes("سوق العبيدي"));
  assert.equal(getPlaceImages("علمني عن قصر الزاحم", "ar").length, 0);
  // Families are still off limits
  assert.equal(isFamilyOrTribalQuestion("وش عوائل القصب"), true);
});

test("salam is answered like a host", () => {
  for (let i = 0; i < 10; i++) {
    const r = getInstantSalamReply("ar");
    assert.ok(r.startsWith("وعليكم السلام"));
    assert.ok(r.includes("القَصَب"));
  }
  const prompt = buildAlQasabSystemPrompt(undefined, "ar");
  assert.ok(prompt.includes("مرشد سياحي"));
  assert.ok(prompt.includes("حيّاك الله في ديرتنا"));
  assert.ok(prompt.includes("قصر الزاحم"));
});
