// Tour-guide knowledge for «الداهية»: researched facts about Al-Qasab, its salt pans,
// heritage landmarks and the salt season, plus real photos shown in the chat.
// Sources (Oct 2026): SPA/واس, سبق, عاجل, جريدة الرياض, عكاظ, qasab.info, سعوديبيديا,
// Visit Saudi, CNN بالعربية. Where sources disagree the wording below stays general.

export interface PlaceImage {
  src: string;
  captionAr: string;
  captionEn: string;
}

export interface PlaceTopic {
  id: string;
  titleAr: string;
  titleEn: string;
  // Normalised keywords (no diacritics, ة→ه, أ/إ/آ→ا); matched as substrings
  keywords: string[];
  answerAr: string;
  answerEn: string;
  images?: PlaceImage[];
}

const SALT_PAN_IMAGES: PlaceImage[] = [
  {
    src: "/images/places/mamlaha-sign.jpg",
    captionAr: "مدخل مملحة القَصَب واللوحة التعريفية",
    captionEn: "Entrance sign of the Al-Qasab salt pans",
  },
  {
    src: "/images/places/mamlaha-basins.jpg",
    captionAr: "أحواض تبخير الملح في المملحة",
    captionEn: "Salt evaporation basins",
  },
  {
    src: "/images/places/mamlaha-reed-shades.jpg",
    captionAr: "مظلات القصب والخوص لجلسات الزوار",
    captionEn: "Reed shades for visitors at the salt pans",
  },
  {
    src: "/images/places/mamlaha-crystal-pool.jpg",
    captionAr: "حوض يتبلور فيه الملح مع التبخر",
    captionEn: "A brine pool where salt crystallises",
  },
  {
    src: "/images/places/sabkha-pink-lake.jpg",
    captionAr: "ماء شديد الملوحة بلون وردي في الصْبخة",
    captionEn: "Pink, highly saline brine in Al-Sabkha",
  },
];

export const PLACE_TOPICS: PlaceTopic[] = [
  {
    id: "salt_pans",
    titleAr: "ممالح القَصَب (الجفار)",
    titleEn: "Al-Qasab salt pans (Al-Jifar)",
    keywords: ["مملحه", "ممالح", "المملحه", "الممالح", "جفار", "الجفاره", "ملاحات", "salt pan", "saltworks", "salt flat"],
    answerAr:
      "ممالح القَصَب يا بعد حيي هي «الذهب الأبيض»! أكثر من عشرين مملحة متجاورة في أرض الصْبخة، تبعد عن البلد حوالي ٤ إلى ٥ كيلو جنوب شرق، والناس يسمونها «الجفار» من «الجفر» يعني الحفرة الواسعة. كانت بحيرة وصارت صْبخة ملحية، وأهل القَصَب يستخرجون منها الملح من قرابة ثلاثة قرون، أول باليد وبجهد كبير، واليوم فيه تنقية وتعبئة حديثة. وتراها اليوم مزار سياحي فيه ممرات خشبية ومظلات من القصب، تعال شوفها بعينك!",
    answerEn:
      "The Al-Qasab salt pans are the town's 'white gold': more than twenty adjacent pans in the salt flat, about 4–5 km southeast of town, known locally as «Al-Jifar» (from jafr, a wide pit). It was once a lake that turned into a salt flat, and salt has been harvested here for around three centuries, first by hand, today with modern purification and packing. The site now welcomes visitors with wooden walkways and reed shades.",
    images: SALT_PAN_IMAGES,
  },
  {
    id: "sabkha",
    titleAr: "صْبخة القَصَب",
    titleEn: "Al-Sabkha",
    keywords: ["سبخه", "صبخه", "السبخه", "الصبخه", "sabkha"],
    answerAr:
      "الصْبخة أرض ملحية واسعة جنوب القَصَب، وفيها الممالح. ماؤها شديد الملوحة، وأحياناً يصير لونه وردي من كائنات دقيقة تعيش في الماء المالح، وحولها قشرة ملح بيضاء تلمع. وفي ليالي الصيف تكون أبرد من اللي حولها بخمس إلى عشر درجات، جوها يونّس!",
    answerEn:
      "Al-Sabkha is the wide salt flat south of Al-Qasab where the salt pans lie. Its brine is very salty, sometimes pink from salt-loving microorganisms, edged with sparkling white crust, and on summer nights it is 5–10°C cooler than its surroundings.",
    images: [SALT_PAN_IMAGES[4], SALT_PAN_IMAGES[3], SALT_PAN_IMAGES[1]],
  },
  {
    id: "zahim_palace",
    titleAr: "قصر الزاحم التاريخي",
    titleEn: "Al-Zahim historic palace",
    keywords: ["زاحم", "الزاحم"],
    answerAr:
      "قصر الزاحم من أبرز معالم القَصَب، جنب الجامع في البلدة القديمة، وعمره فوق المية سنة، وهو بيت الشيخ عبدالله بن عبدالوهاب بن زاحم رحمه الله، اللي ولد في القَصَب وصار قاضي ورافق الملك عبدالعزيز في توحيد البلاد، منها ضم حائل والحجاز، وآخر عمله رئاسة المحاكم الشرعية في المدينة المنورة وتوفي فيها عام ١٣٧٤هـ. البيت صار محكمة البلد عام ١٣٨٠هـ، وانرمم عام ١٤٣٦هـ، وفيه اليوم وثائق وصور من تاريخ الدولة، وأبوابه مفتوحة للزوار مع مرشدين وضيافة.",
    answerEn:
      "Al-Zahim Palace stands beside the old town's main mosque and is over a century old. It was the home of Sheikh Abdullah bin Abdulwahhab bin Zahim, born in Al-Qasab, a judge who accompanied King Abdulaziz during the unification (including Hail and the Hijaz) and later headed the Sharia courts in Madinah, where he died in 1374 AH. The house served as the town court from 1380 AH, was restored in 1436 AH, and now displays documents and photos from the history of the Saudi state, open to visitors with guides and hospitality.",
  },
  {
    id: "qusaibi_building",
    titleAr: "مبنى القصبي التراثي",
    titleEn: "Al-Qusaibi heritage building",
    keywords: ["القصبي", "قصبي"],
    answerAr:
      "مبنى القصبي التراثي يقع في قلب البلدة القديمة بالمنطقة المركزية لسوق العبيدي، وأدواره العلوية مفتوحة للزوار والمهتمين، وتشوف منه طابع البناء الطيني النجدي في وسط السوق. ما عندي تفاصيل أكثر موثقة عن تاريخ بنائه، وإذا تبي أدلّك على سوق العبيدي اللي هو فيه فأبشر.",
    answerEn:
      "The Al-Qusaibi heritage building sits in the heart of the old town, in the central area of Souq Al-Obaidi; its upper floors are open to visitors. I don't have more documented detail on its construction history, but I can guide you around Souq Al-Obaidi where it stands.",
  },
  {
    id: "obaidi_souq",
    titleAr: "سوق العبيدي",
    titleEn: "Souq Al-Obaidi",
    keywords: ["العبيدي", "عبيدي", "السوق القديم"],
    answerAr:
      "سوق العبيدي هو سوق القَصَب المركزي في البلدة القديمة قرب الجامع بحي القصر، والدكاكين تحيط فيه من كل الجهات إلا الجنوب، وتذكر المصادر إن تاريخه يرجع لأكثر من ٢٥٠ سنة، ويعد من أقدم أسواق نجد. حوله مباني تراثية مثل مبنى القصبي، ويتولاه اليوم بلدية القَصَب.",
    answerEn:
      "Souq Al-Obaidi is Al-Qasab's central market in the old town near the main mosque, in the Al-Qasr quarter, ringed by shops on every side but the south. Sources date it back more than 250 years, making it one of Najd's oldest markets. Heritage buildings such as the Al-Qusaibi building surround it.",
  },
  {
    id: "rashid_house",
    titleAr: "منزل الراشد التراثي",
    titleEn: "Al-Rashid heritage house",
    keywords: ["الراشد", "راشد"],
    answerAr:
      "منزل (قصر) الراشد التراثي في الجهة الجنوبية الغربية من البلدة، مبني على السور القديم ويضم أحد أبراجه، دورين فيها ١٤ غرفة و٢١ عمود حجري. استلمته هيئة السياحة والتراث عام ١٤٣٣هـ ورممته، وتشغّله بلدية القَصَب، ومجلسه مؤثث بأثاث شعبي.",
    answerEn:
      "The Al-Rashid heritage house sits on the southwestern edge of town, built into the old wall and including one of its towers: two floors, 14 rooms and 21 stone pillars. The heritage authority took it over and restored it from 1433 AH, and the municipality runs it with a traditionally furnished majlis.",
  },
  {
    id: "old_town",
    titleAr: "البلدة القديمة وسور العقدة",
    titleEn: "The old town and Al-Aqda wall",
    keywords: ["البلده القديمه", "الديره القديمه", "السور", "العقده", "بوابات", "الطين", "طينيه"],
    answerAr:
      "البلدة القديمة في القَصَب كلها بيوت طين نجدية وأزقة، وكان يحيط فيها سور اسمه «العقدة»، انهدمت أجزاء منه وانرممت آثار باقية. وفيها سوق العبيدي وقصر الزاحم ومنزل الراشد ومبنى القصبي، مشوار يومك كله تراث!",
    answerEn:
      "Al-Qasab's old town is a maze of Najdi mud-brick houses and lanes, once enclosed by a wall called «Al-Aqda», parts of which survive restored. Souq Al-Obaidi, Al-Zahim Palace, the Al-Rashid house and the Al-Qusaibi building are all here.",
  },
  {
    id: "marqab",
    titleAr: "مرقب القَصَب",
    titleEn: "Al-Qasab watchtower",
    keywords: ["مرقب", "المرقب", "برج"],
    answerAr:
      "مرقب القَصَب برج مراقبة قديم شرق البلد فوق تل، ويقال إنه كان من سلسلة أبراج تحمي البلدة قديم، تطلع فوقه وتشوف القَصَب كلها.",
    answerEn:
      "The Al-Qasab marqab is an old watchtower east of town on a hill, said to have been part of a chain of towers that protected the town.",
  },
  {
    id: "season",
    titleAr: "موسم ملح القَصَب",
    titleEn: "Al-Qasab Salt Season",
    keywords: ["موسم", "مهرجان", "فعاليات", "festival", "season"],
    answerAr:
      "موسم ملح القَصَب تنظمه أمانة منطقة الرياض عن طريق بلدية القَصَب، يحتفي بالذهب الأبيض وطرق استخراجه. النسخة الأولى كانت في مارس ٢٠٢٣، والثانية في فبراير ٢٠٢٤، والثالثة من ٢٠ إلى ٢٧ فبراير ٢٠٢٥ بأكثر من ٦٠ عارض. وفيه مملحة نموذجية تشرح مراحل الاستخراج، ومسارات للملح، ومسرح ثقافي وكتاتيب، وركن للأطفال، والأسر المنتجة، وعروض خيل وإبل وسيارات كلاسيكية. وموعد الموسم الجاي ١٩ نوفمبر ٢٠٢٦ بإذن الله، والدخول مجاني.",
    answerEn:
      "The Al-Qasab Salt Season is organised by the Riyadh Region Municipality through Al-Qasab Municipality to celebrate the town's 'white gold'. Editions ran in March 2023, February 2024 and 20–27 February 2025 (60+ exhibitors), with a model salt pan, salt trails, a cultural theatre, traditional kuttab schools, a kids' zone, family producers, and horse, camel and classic-car shows. The next season launches on 19 November 2026, with free entry.",
  },
  {
    id: "town",
    titleAr: "مدينة القَصَب",
    titleEn: "Al-Qasab town",
    keywords: ["تاريخ القصب", "عن القصب", "مدينه القصب", "بلده القصب", "تعريف", "نبذه"],
    answerAr:
      "القَصَب من أقدم بلدات الوشم في نجد، تتبع محافظة شقراء بمنطقة الرياض، على بعد حوالي ١٥٠ كيلو شمال غرب الرياض. بلدة قديمة من العصر الجاهلي ذكرها ياقوت الحموي، واشتهرت قديم بالبر والملح، وتسمى «مدينة الذهب الأبيض» و«بلدة الملح والشعراء». فيها ممالح الجفار والصْبخة، والبلدة القديمة بسوق العبيدي وقصورها التراثية، ومرقبها.",
    answerEn:
      "Al-Qasab is one of the oldest towns of Al-Washm in Najd, part of Shaqra Governorate in the Riyadh Region, roughly 150 km northwest of Riyadh. Mentioned by Yaqut al-Hamawi and dating back to pre-Islamic times, it was known for wheat and salt and is called the 'City of White Gold' and the 'town of salt and poets'.",
  },
];

const normalize = (value: string) =>
  (value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "")
    .trim();

/** The landmark/topic a question is about, if any (first match wins: specific places before general ones). */
export function matchPlaceTopic(message: string): PlaceTopic | null {
  const norm = normalize(message);
  // Specific landmarks first; the general "season"/"town" topics last
  const ordered = [...PLACE_TOPICS].sort((a, b) => (a.id === "season" || a.id === "town" ? 1 : 0) - (b.id === "season" || b.id === "town" ? 1 : 0));
  return ordered.find(t => t.keywords.some(k => norm.includes(normalize(k)))) || null;
}

/** Real photos to show under an answer about a place (empty when the place has none). */
export function getPlaceImages(message: string, lang: "ar" | "en" = "ar"): { src: string; caption: string }[] {
  const topic = matchPlaceTopic(message);
  return (topic?.images || []).map(img => ({ src: img.src, caption: lang === "en" ? img.captionEn : img.captionAr }));
}

// Greetings in the voice of a hospitable Najdi tour guide
const SALAM_REPLIES_AR = [
  "وعليكم السلام ورحمة الله وبركاته، حيّاك الله في ديرتنا القَصَب، يا هلا ومسهلا! أنا «الداهية» مرشدك السياحي هنا. وش ودك نبدأ فيه: الممالح والصْبخة، ولا البلدة القديمة وقصورها، ولا موسم الملح؟",
  "وعليكم السلام ورحمة الله وبركاته، يا مرحبا وألف هلا! نوّرت ديرتنا القَصَب، ديرة الملح والطين. أنا «الداهية» مرشدك، آمرني وين تبي أوديك اليوم؟",
  "وعليكم السلام ورحمة الله، حيّاك الله وبيّاك في القَصَب! أنا «الداهية» مرشدك السياحي، اسألني عن الجفار والصْبخة وقصر الزاحم وسوق العبيدي وموسم الملح، وأبشر بعزك.",
];
const WELCOME_REPLIES_EN = [
  "Welcome to our hometown, Al-Qasab! I'm «Al-Dahiya», your local tour guide. Shall we start with the salt pans and Al-Sabkha, the old town and its palaces, or the Salt Season?",
  "A warm welcome to Al-Qasab, the town of salt and mud-brick heritage! I'm «Al-Dahiya», your guide. Where would you like to go today?",
];

/** Greeting reply; in English it opens with "Wa alaykum assalam" only when the user actually said salam. */
export function pickSalamReply(lang: "ar" | "en" = "ar", userSaidSalam = true): string {
  if (lang === "ar") return SALAM_REPLIES_AR[Math.floor(Math.random() * SALAM_REPLIES_AR.length)];
  const welcome = WELCOME_REPLIES_EN[Math.floor(Math.random() * WELCOME_REPLIES_EN.length)];
  return userSaidSalam ? `Wa alaykum assalam! ${welcome}` : `Hello! ${welcome}`;
}

/** Short greeting to put in front of an answer when the user opened with «السلام عليكم» plus a question. */
export const SALAM_PREFIX_AR = "وعليكم السلام ورحمة الله وبركاته، حيّاك الله في ديرتنا..";
export const SALAM_PREFIX_EN = "Wa alaykum assalam, welcome to Al-Qasab!";

// Facts block for the system prompts
export const GUIDE_FACTS_AR = PLACE_TOPICS.map(t => `- **${t.titleAr}:** ${t.answerAr}`).join("\n");
export const GUIDE_FACTS_EN = PLACE_TOPICS.map(t => `- ${t.titleEn}: ${t.answerEn}`).join("\n");
