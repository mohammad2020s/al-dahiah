// Tour-guide knowledge for «الداهية»: researched facts about Al-Qasab, its salt pans,
// heritage landmarks and the salt season, plus real photos shown in the chat.
// Sources (Oct 2026): SPA/واس, سبق, عاجل, جريدة الرياض, عكاظ, qasab.info, سعوديبيديا,
// Visit Saudi, CNN بالعربية. Where sources disagree the wording below stays general.

export interface PlaceImage {
  src: string;
  captionAr: string;
  captionEn: string;
  /** Set when the photo was taken by someone else (e.g. visitors on Google Maps) */
  credit?: "google_maps_visitors";
}

const GM = "google_maps_visitors" as const;
// Photos of مَمْلَحَة المقحم النموذجية (أبو سهيل), cropped from visitors' photos on its Google Maps page
const MUQHIM_IMAGES: PlaceImage[] = [
  { src: "/images/places/muqhim-visitors-walkway.jpg", captionAr: "زوار على الممشى الخشبي بين أكواخ الخوص", captionEn: "Visitors on the wooden walkway between reed huts", credit: GM },
  { src: "/images/places/muqhim-entrance-stone.jpg", captionAr: "صخرة مملحة القصب عند المدخل مع الأحواض", captionEn: "Mamalahat Al Qasab entrance stone with the basins", credit: GM },
  { src: "/images/places/muqhim-wooden-bridge.jpg", captionAr: "الجسر الخشبي وأحواض الملح في الفجر", captionEn: "Wooden bridge over the salt basins at dawn", credit: GM },
  { src: "/images/places/muqhim-salt-booth.jpg", captionAr: "كشك الملح الطبيعي داخل المملحة", captionEn: "Natural salt kiosk inside the salt pan", credit: GM },
  { src: "/images/places/muqhim-sign-new.jpg", captionAr: "لوحة مملحة المقحم والأكواخ في الخلف", captionEn: "Al-Muqhim Salt Shop sign with reed huts in background", credit: GM },
];

export interface PlaceTopic {
  id: string;
  titleAr: string;
  titleEn: string;
  // Normalised keywords (no diacritics, ة→ه, أ/إ/آ→ا); matched as substrings
  keywords: string[];
  answerAr: string;
  answerEn: string;
  images?: PlaceImage[];
  /** Google Maps page of the place (opens its photos and directions in Google Maps) */
  mapsUrl?: string;
  /** Exact spot, for the map under chat answers */
  coordinates?: { lat: number; lng: number };
}

const MUQHIM_PAN_MAPS_URL = "https://maps.app.goo.gl/DsMP4ruDfFH2wwZh9";

const SALT_PAN_IMAGES: PlaceImage[] = [
  {
    src: "/images/places/mamlaha-sign.jpg",
    captionAr: "مدخل مَمْلَحَة القَصَب واللوحة التعريفية",
    captionEn: "Entrance sign of the Al-Qasab salt pans",
  },
  {
    src: "/images/places/mamlaha-basins.jpg",
    captionAr: "أحواض تبخير الملح في المَمْلَحَة",
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
    captionAr: "ماء شديد الملوحة بلون وردي في أحواض الملح",
    captionEn: "Pink, highly saline brine in the salt basins",
  },
];

export const PLACE_TOPICS: PlaceTopic[] = [
  {
    id: "muqhim_pan",
    titleAr: "مَمْلَحَة المقحم النموذجية (أبو سهيل)",
    titleEn: "Al-Muqhim Model Salt Pan (Abu Suhail)",
    keywords: ["المقحم", "مقحم", "ابوسهيل", "ابو سهيل"],
    answerAr:
      "مَمْلَحَة المقحم النموذجية (أبو سهيل) من مَمَالح القَصَب في الجِفار جنوب شرق البلد، فيها أحواض الملح المستطيلة اللي يتبخر فيها الماء ويبقى الملح الأبيض. تقدر تشوف صورها وموقعها على خرائط Google، وإذا جيتها تعال الصبح بدري والشمس هادية.",
    answerEn:
      "Al-Muqhim Model Salt Pan (Abu Suhail) is one of the Al-Qasab salt pans in Al-Jifar, southeast of town, with rectangular basins where the water evaporates and leaves white salt. Its photos and location are on Google Maps; come early in the morning for the best light.",
    images: MUQHIM_IMAGES,
    mapsUrl: MUQHIM_PAN_MAPS_URL,
    coordinates: { lat: 25.260929, lng: 45.548462 },
  },
  {
    id: "sabkha",
    titleAr: "صْبَخَة القَصَب",
    titleEn: "Al-Sabkha",
    keywords: ["سبخه", "صبخه", "السبخه", "الصبخه", "sabkha"],
    answerAr:
      "صْبَخَة القَصَب مكان مستقل وغير عن مَمْلَحَة القَصَب (الجِفار)، لا تخلط بينهم! أرض سبخية مفتوحة جنوب البلد بحوالي ٣ كيلو، أرضها حصى وتراب مستوي على مد النظر، يطلع لها أهل القَصَب والزوار في الليل يفرشون ويتقهوون ويكشتون، وتشوف أنوار البلد بعيد على الأفق. وفي ليالي الصيف تكون أبرد من اللي حولها بخمس إلى عشر درجات، جوها يونّس!",
    answerEn:
      "Al-Sabkha is a separate place from the Al-Qasab salt pans (Al-Jifar), so never mix them up. It is an open flat plain about 3 km south of town, gravel and packed earth as far as the eye can see, where locals and visitors spread a rug at night for coffee and stargazing with the town lights on the horizon. On summer nights it is 5–10°C cooler than its surroundings.",
    images: [
      { src: "/images/places/sabkha-night.jpg", captionAr: "جلسة ليلية على أرض الصْبَخَة وأنوار القَصَب في الأفق", captionEn: "A night rug on Al-Sabkha with Al-Qasab's lights on the horizon", credit: GM },
    ],
    mapsUrl: "https://maps.app.goo.gl/BYu4pZc2gGV15dEG8",
    coordinates: { lat: 25.2664295, lng: 45.5109836 },
  },
  {
    id: "salt_pans",
    titleAr: "مَمَالح القَصَب (الجِفار)",
    titleEn: "Al-Qasab salt pans (Al-Jifar)",
    keywords: ["مملحه", "ممالح", "المملحه", "الممالح", "جفار", "الجفاره", "ملاحات", "salt pan", "saltworks", "salt flat"],
    answerAr:
      "مَمَالح القَصَب يا بعد حيي هي «الذهب الأبيض»! أكثر من عشرين مَمْلَحَة متجاورة تبعد عن البلد حوالي ٤ إلى ٥ كيلو جنوب شرق، والناس يسمونها «الجِفار» من «الجفر» يعني الحفرة الواسعة. كانت بحيرة وصارت أرض ملحية، وأهل القَصَب يستخرجون منها الملح من قرابة ثلاثة قرون، أول باليد وبجهد كبير، واليوم فيه تنقية وتعبئة حديثة. ومن مَمَالحها المعروفة مَمْلَحَة المقحم النموذجية (أبو سهيل). وتراها اليوم مزار سياحي فيه ممرات خشبية ومظلات من الخوص، تعال شوفها بعينك!",
    answerEn:
      "The Al-Qasab salt pans are the town's 'white gold': more than twenty adjacent pans about 4–5 km southeast of town, known locally as «Al-Jifar» (from jafr, a wide pit). It was once a lake that turned into salt ground, and salt has been harvested here for around three centuries, first by hand, today with modern purification and packing. The site now welcomes visitors with wooden walkways and reed shades.",
    images: [...SALT_PAN_IMAGES, MUQHIM_IMAGES[0], MUQHIM_IMAGES[2], MUQHIM_IMAGES[4]],
    mapsUrl: MUQHIM_PAN_MAPS_URL,
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
    titleAr: "البلدة القديمة",
    titleEn: "The old town",
    keywords: ["البلده القديمه", "الديره القديمه", "السور", "بوابات", "الطين", "طينيه"],
    answerAr:
      "البلدة القديمة في القَصَب كلها بيوت طين نجدية وأزقة. وفيها سوق العبيدي وقصر الزاحم ومنزل الراشد ومبنى القصبي، مشوار يومك كله تراث!",
    answerEn:
      "Al-Qasab's old town is a maze of Najdi mud-brick houses and lanes. Souq Al-Obaidi, Al-Zahim Palace, the Al-Rashid house and the Al-Qusaibi building are all here.",
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
      "موسم ملح القَصَب تنظمه أمانة منطقة الرياض عن طريق بلدية القَصَب، يحتفي بالذهب الأبيض وطرق استخراجه. النسخة الأولى كانت في مارس ٢٠٢٣، والثانية في فبراير ٢٠٢٤، والثالثة من ٢٠ إلى ٢٧ فبراير ٢٠٢٥ بأكثر من ٦٠ عارض. وفيه مَمْلَحَة نموذجية تشرح مراحل الاستخراج، ومسارات للملح، ومسرح ثقافي وكتاتيب، وركن للأطفال، والأسر المنتجة، وعروض خيل وإبل وسيارات كلاسيكية. وموعد الموسم الجاي ١٩ نوفمبر ٢٠٢٦ بإذن الله، والدخول مجاني.",
    answerEn:
      "The Al-Qasab Salt Season is organised by the Riyadh Region Municipality through Al-Qasab Municipality to celebrate the town's 'white gold'. Editions ran in March 2023, February 2024 and 20–27 February 2025 (60+ exhibitors), with a model salt pan, salt trails, a cultural theatre, traditional kuttab schools, a kids' zone, family producers, and horse, camel and classic-car shows. The next season launches on 19 November 2026, with free entry.",
  },
  {
    id: "town",
    titleAr: "مدينة القَصَب",
    titleEn: "Al-Qasab town",
    keywords: ["تاريخ القصب", "عن القصب", "مدينه القصب", "بلده القصب", "تعريف", "نبذه"],
    answerAr:
      "القَصَب من أقدم بلدات الوشم في نجد، تتبع محافظة شقراء بمنطقة الرياض، على بعد حوالي ١٥٠ كيلو شمال غرب الرياض. بلدة قديمة من العصر الجاهلي ذكرها ياقوت الحموي، واشتهرت قديم بالبر والملح، وتسمى «مدينة الذهب الأبيض» و«بلدة الملح والشعراء». فيها مَمَالح الجِفار والصْبَخَة، والبلدة القديمة بسوق العبيدي وقصورها التراثية، ومرقبها.",
    answerEn:
      "Al-Qasab is one of the oldest towns of Al-Washm in Najd, part of Shaqra Governorate in the Riyadh Region, roughly 150 km northwest of Riyadh. Mentioned by Yaqut al-Hamawi and dating back to pre-Islamic times, it was known for wheat and salt and is called the 'City of White Gold' and the 'town of salt and poets'.",
  },
];

const normalize = (value: string) =>
  (value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "")
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
export function getPlaceImages(message: string, lang: "ar" | "en" = "ar"): { src: string; caption: string; credit?: string }[] {
  const topic = matchPlaceTopic(message);
  return (topic?.images || []).map(img => ({
    src: img.src,
    caption: lang === "en" ? img.captionEn : img.captionAr,
    ...(img.credit ? { credit: lang === "en" ? "Photo: visitors on Google Maps" : "الصورة من زوار المكان على Google Maps" } : {}),
  }));
}

/** Google Maps link for the place a message is about, when we have one. */
export function getPlaceMapsUrl(message: string): string | undefined {
  return matchPlaceTopic(message)?.mapsUrl;
}

export const placeById = (id: string) => PLACE_TOPICS.find(t => t.id === id) || null;

/** Map pin for a place that has its own coordinates (beats the generic landmark lookup). */
export function getPlaceLocation(message: string, lang: "ar" | "en" = "ar") {
  const topic = matchPlaceTopic(message);
  if (!topic?.coordinates) return null;
  return { name: lang === "en" ? topic.titleEn : topic.titleAr, coordinates: topic.coordinates, type: "place" as const };
}

// Greetings in the voice of a hospitable Najdi tour guide
const SALAM_REPLIES_AR = [
  "وعليكم السلام ورحمة الله وبركاته، حيّاك الله في ديرتنا القَصَب، يا هلا ومسهلا! أنا «الداهية» مرشدك السياحي هنا. وش ودك نبدأ فيه: المَمَالح والصْبَخَة، ولا البلدة القديمة وقصورها، ولا موسم الملح؟",
  "وعليكم السلام ورحمة الله وبركاته، يا مرحبا وألف هلا! نوّرت ديرتنا القَصَب، ديرة الملح والطين. أنا «الداهية» مرشدك، آمرني وين تبي أوديك اليوم؟",
  "وعليكم السلام ورحمة الله، حيّاك الله وبيّاك في القَصَب! أنا «الداهية» مرشدك السياحي، اسألني عن الجِفار والصْبَخَة وقصر الزاحم وسوق العبيدي وموسم الملح، وأبشر بعزك.",
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
