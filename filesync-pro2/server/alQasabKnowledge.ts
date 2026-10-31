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
  { src: "/images/places/muqhim-entrance-stone.jpg", captionAr: "الصخرة عند مدخل مَمْلَحَة المقحم النموذجية وأحواضها", captionEn: "The stone at the entrance of the Al-Muqhim model salt pan, with its basins", credit: GM },
  { src: "/images/places/muqhim-wooden-bridge.jpg", captionAr: "الجسر الخشبي وأحواض الملح في الفجر", captionEn: "Wooden bridge over the salt basins at dawn", credit: GM },
  { src: "/images/places/muqhim-salt-booth.jpg", captionAr: "كشك الملح الطبيعي في مَمْلَحَة المقحم", captionEn: "The natural salt kiosk at Al-Muqhim", credit: GM },
  { src: "/images/places/muqhim-sign-new.jpg", captionAr: "لوحة مملحة المقحم والأكواخ في الخلف", captionEn: "Al-Muqhim Salt Shop sign with reed huts in background", credit: GM },
];

// Photos of قصر الشيخ عبدالله بن زاحم, cropped from visitors' photos on its Google Maps page
const ZAHIM_IMAGES: PlaceImage[] = [
  { src: "/images/places/zahim-entrance.jpg", captionAr: "مدخل القصر واللوحة التعريفية بالشيخ عبدالله بن زاحم", captionEn: "The palace entrance and the sign about Sheikh Abdullah bin Zahim", credit: GM },
  { src: "/images/places/zahim-reception-hall.jpg", captionAr: "مجلس الاستقبال بسقفه الخشبي ووثائق وصور من تاريخ الدولة", captionEn: "Reception hall with its wooden ceiling, documents and photos of the Saudi state", credit: GM },
  { src: "/images/places/zahim-hall-columns.jpg", captionAr: "القاعة بأعمدتها البيضاء والمعرض على جدرانها", captionEn: "The hall with white columns and the exhibition on its walls", credit: GM },
  { src: "/images/places/zahim-pillars-exhibit.jpg", captionAr: "جلسة نجدية بين الأعمدة الطينية ولوحات عن سيرة الشيخ", captionEn: "Najdi seating between mud pillars and panels on the Sheikh's life", credit: GM },
  { src: "/images/places/zahim-majlis-carpets.jpg", captionAr: "مجلس نجدي مفروش بالسجاد والزخارف الجصية", captionEn: "A carpeted Najdi majlis with white plaster decorations", credit: GM },
];

// Photos of مملحة مركز القصب, cropped from visitors' photos on its Google Maps page
const MAMLAHA_VISITOR_IMAGES: PlaceImage[] = [
  { src: "/images/places/mamlaha-harvest.jpg", captionAr: "أكوام الملح الأبيض جنب الأحواض وقت الاستخراج", captionEn: "White salt heaps beside the basins during harvest", credit: GM },
  { src: "/images/places/mamlaha-salt-hill.jpg", captionAr: "تلّة ملح على طرف حوض التبخير", captionEn: "A hill of salt at the edge of an evaporation basin", credit: GM },
  { src: "/images/places/mamlaha-green-pool.jpg", captionAr: "حوض ماء مالح صافي وعلى حافته قشرة الملح", captionEn: "A clear brine pool rimmed with salt crust", credit: GM },
  { src: "/images/places/mamlaha-salt-heaps.jpg", captionAr: "صف أكوام الملح على امتداد الممالح", captionEn: "Rows of salt heaps along the salt pans", credit: GM },
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
  /** A button under the answer (e.g. the official city site) */
  link?: { url: string; labelAr: string; labelEn: string };
}

const OFFICIAL_SITE = { url: "https://qasabcity.com", labelAr: "الموقع الرسمي لمدينة القصب", labelEn: "Al-Qasab official city guide" };

const MUQHIM_PAN_MAPS_URL = "https://maps.app.goo.gl/DsMP4ruDfFH2wwZh9";
// «مملحة مركز القصب» on Google Maps (the big working salt pans, not Al-Muqhim)
const QASAB_SALT_PANS_MAPS_URL = "https://maps.app.goo.gl/KVeAM8kF1rZ54eF47";


export const PLACE_TOPICS: PlaceTopic[] = [
  {
    id: "muqhim_pan",
    titleAr: "مَمْلَحَة المقحم النموذجية (أبو سهيل)",
    titleEn: "Al-Muqhim Model Salt Pan (Abu Suhail)",
    keywords: ["المقحم", "مقحم", "ابوسهيل", "ابو سهيل", "muqhim"],
    answerAr:
      "مَمْلَحَة المقحم النموذجية (أبو سهيل) غير مَمْلَحَة القَصَب، لا تخلط بينهم! مَمْلَحَة القَصَب هي الممالح الكبيرة (الجِفار) اللي ينستخرج منها الملح بكميات وتشوف فيها أكوام الملح والمعدّات، أما المقحم فمَمْلَحَة نموذجية مهيّأة للزوار جنوب شرق البلد: فيها ممشى وجسر خشبي بين أحواض الملح، وأكواخ من الخوص تجلس فيها، وكشك تشتري منه ملح طبيعي. تعال لها الصبح بدري والشمس هادية، وتلقى صورها وموقعها تحت.",
    answerEn:
      "The Al-Muqhim Model Salt Pan (Abu Suhail) is NOT the Al-Qasab salt pans, so don't mix them up. The Al-Qasab salt pans (Al-Jifar) are the big working pans where salt is harvested in bulk, with salt heaps and machinery; Al-Muqhim is a model salt pan set up for visitors southeast of town, with a wooden walkway and bridge between the basins, reed huts to sit in, and a kiosk selling natural salt. Come early in the morning for the soft light; its photos and location are below.",
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
      "صْبَخَة القَصَب بمعناها الواسع منطقة كبيرة مستوية تتركّز الممالح في جزء يسير منها، أما مكان الجلسات اللي على الخريطة فغير الممالح (الجِفار)، لا تخلط بينهم! أرض سبخية مفتوحة جنوب البلد بحوالي ٣ كيلو، أرضها حصى وتراب مستوي على مد النظر، يطلع لها أهل القَصَب والزوار في الليل يفرشون ويتقهوون ويكشتون، وتشوف أنوار البلد بعيد على الأفق. ويسمونها «منتزه الصْبَخَة الصيفي»: أرضها ندية، وفي ليالي الصيف تكون أبرد من اللي حولها بخمس إلى عشر درجات، وما فيها قوارص ولا حشرات لأن تربتها فيها أملاح. وقال فيها الشاعر إبراهيم الجريان: «وصبخةٍ في ليالي القيظ نحسّ ان جوّها ممطور».",
    answerEn:
      "Al-Qasab's sabkha is, broadly, a wide flat area with the salt pans concentrated in a small part of it; the night-sitting spot on the map is not the salt pans (Al-Jifar), so don't mix them up. It is an open flat plain about 3 km south of town, gravel and packed earth as far as the eye can see, where locals and visitors spread a rug at night for coffee and stargazing with the town lights on the horizon. Locals call it the summer night park: its ground stays damp, it is 5–10°C cooler than its surroundings on summer nights, and the salt in the soil keeps biting insects away.",
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
    keywords: ["مملحه", "ممالح", "المملحه", "الممالح", "جفار", "الجفاره", "ملاحات", "الذهب الابيض", "salt pan", "saltworks", "salt flat"],
    answerAr:
      "مَمَالح القَصَب يا بعد حيي هي «الذهب الأبيض»! تقع غرب جبل طويق وجنوب شرق البلد بحوالي ٦ إلى ٨ كيلو، ومساحتها قرابة ٥٠ كيلو متر مربع على شكل مستطيل طوله ١١ كيلو وعرضه ٤، وفيها أكثر من عشرين مَمْلَحَة متجاورة يسمونها أهل القَصَب «الجِفار» أو «الجفارة» من «الجفر» يعني الحفرة الواسعة. كانت بحيرة وجفّت مع الزمن وصارت أرض ملحية، وذكرها الهمداني في «صفة جزيرة العرب» باسم «ملح القُصَيبة»، وأهل القَصَب يستخرجون منها الملح من قرابة ثلاثة قرون، أول باليد وبجهد كبير، واليوم بالمعدّات وفيه تنقية وتعبئة حديثة، وتشوف فيها أحواض الماء المالح وأكوام الملح الأبيض مثل التلال. واليوم تغطي قرابة ثلث احتياج السوق السعودي من ملح الطعام، ويتوزع إنتاجها محلياً وخليجياً. ولا تخلطها بمَمْلَحَة المقحم النموذجية، هذيك غيرها: مَمْلَحَة صغيرة مهيّأة للزوار فيها ممشى خشبي وأكواخ خوص.",
    answerEn:
      "The Al-Qasab salt pans are the town's 'white gold': west of the Tuwaiq escarpment, about 6–8 km southeast of town, covering roughly 50 km² in an 11 × 4 km rectangle, with more than twenty adjacent pans known locally as «Al-Jifar» or «Al-Jifara» (from jafr, a wide pit). It was once a lake that dried into salt ground, mentioned by al-Hamdani in «Sifat Jazirat al-Arab» as «the salt of Al-Qusaiba»; and salt has been harvested here for around three centuries, first by hand, today with machinery, purification and packing; you see brine basins and white salt heaps like hills. Today it covers about a third of Saudi Arabia's table-salt needs and is sold locally and across the Gulf. Don't confuse them with the Al-Muqhim Model Salt Pan, a separate small pan set up for visitors with a wooden walkway and reed huts.",
    // Only photos of مملحة مركز القصب itself (Al-Muqhim has its own)
    images: MAMLAHA_VISITOR_IMAGES,
    mapsUrl: QASAB_SALT_PANS_MAPS_URL,
  },
  {
    id: "heritage_places",
    titleAr: "الأماكن التراثية في القَصَب",
    titleEn: "Heritage places in Al-Qasab",
    keywords: ["الاماكن التراثيه", "اماكن تراثيه", "المعالم التراثيه", "معالم تراثيه", "الاماكن التاريخيه", "المعالم التاريخيه", "اماكن تاريخيه", "heritage places", "heritage sites", "historic places"],
    answerAr:
      "القَصَب مليانة تراث يا بعد حيي! هذي أبرز أماكنها التراثية:\n١. قصر الشيخ عبدالله بن زاحم جنب الجامع، فيه وثائق وصور من تاريخ الدولة.\n٢. سوق العبيدي، من أقدم أسواق نجد.\n٣. مبنى القصبي التراثي وسط السوق.\n٤. منزل الراشد على السور القديم.\n٥. مرقب القَصَب، برج المراقبة الطيني.\n٧. أبواب القَصَب وسورها «العَقْدة».\n٦. القرية التراثية بأزقتها وبيوتها الطينية ومقاهيها.\nتبي أعلّمك عن وحدة منها؟",
    answerEn:
      "Al-Qasab is full of heritage! Its main heritage places:\n1. Sheikh Abdullah bin Zahim's palace beside the mosque, with documents and photos from the history of the Saudi state.\n2. Souq Al-Obaidi, one of Najd's oldest markets.\n3. The Al-Qusaibi heritage building in the souq.\n4. The Al-Rashid house on the old town wall.\n5. The Al-Qasab mud-brick watchtower.\n7. Al-Qasab's old gates and town wall («Al-Aqda»).\n6. The heritage village with its mud-brick lanes and cafes.\nWant to hear about one of them?",
    images: ZAHIM_IMAGES.slice(0, 2),
  },
  {
    id: "tourist_places",
    titleAr: "الأماكن السياحية في القَصَب",
    titleEn: "Tourist places in Al-Qasab",
    keywords: ["الاماكن السياحيه", "اماكن سياحيه", "المعالم السياحيه", "معالم سياحيه", "اماكن القصب", "معالم القصب", "tourist places", "attractions", "places to visit", "sights"],
    answerAr:
      "أبشر! هذي أماكن القَصَب السياحية، وتلقاها كلها على الخريطة التفاعلية تحت، اضغط على أي دبوس يطلع لك اسمه:\n• مَمْلَحَة القَصَب (الجِفار): الممالح الكبيرة وأكوام الملح الأبيض.\n• مَمْلَحَة المقحم النموذجية: ممشى خشبي وأكواخ خوص وكشك ملح.\n• الصْبَخَة: جلسات الليل جنوب البلد.\n• أرض موسم ملح القَصَب.\n• القرية التراثية وقصر ابن زاحم.\n• مرقب القَصَب على تل الثويليل.\n• حديقة الملك سلمان، والنادي التشكيلي (السريالي).\n• وبرّا البلد: روضة العكرشية، والواحة الخضراء (بحيرة برودان)، والنفود وجبل الفهدة، ومنتزه الشفيعي، ومتحف ومحمية طيور الوشم.\n• والمقاهي التراثية الأربع.\nوتلقى كل التفاصيل في الموقع الرسمي للمدينة.\nوش تبي أعلّمك عنه أكثر؟",
    answerEn:
      "Here are Al-Qasab's tourist places, all pinned on the interactive map below (tap a pin to see its name):\n• The Al-Qasab salt pans (Al-Jifar): the big pans and hills of white salt.\n• The Al-Muqhim model salt pan: wooden walkway, reed huts and a salt kiosk.\n• Al-Sabkha: night gatherings south of town.\n• The Salt Season grounds.\n• The heritage village and Ibn Zahim's palace.\n• The Al-Qasab watchtower on Al-Thuwaylil hill.\n• King Salman Park and the Surrealist art club.\n• Out of town: Rawdat Al-Akrashiya, the Green Oasis (Burdan lake), the Nafud dunes and Jabal Al-Fahda, Al-Shafei park, and the Al-Washm bird museum and reserve.\n• The four heritage cafes.\nFull details are on the official city guide.\nWhat would you like to know more about?",
    link: OFFICIAL_SITE,
  },
  {
    id: "zahim_palace",
    titleAr: "قصر الزاحم التاريخي",
    titleEn: "Al-Zahim historic palace",
    keywords: ["زاحم", "الزاحم", "zahim"],
    answerAr:
      "قصر الزاحم من أبرز معالم القَصَب، جنب الجامع في البلدة القديمة، وعمره فوق المية سنة، وهو بيت الشيخ عبدالله بن عبدالوهاب بن زاحم رحمه الله، اللي ولد في القَصَب وصار قاضي ورافق الملك عبدالعزيز في توحيد البلاد، منها ضم حائل والحجاز، وآخر عمله رئاسة المحاكم الشرعية في المدينة المنورة وتوفي فيها عام ١٣٧٤هـ. البيت صار محكمة البلد عام ١٣٨٠هـ، وانرمم عام ١٤٣٦هـ، وفيه اليوم وثائق وصور من تاريخ الدولة، وأبوابه مفتوحة للزوار من ٤:٣٠ العصر إلى ٩:٣٠ الليل ببلاش (والأفضل تنسّق قبل)، مع مرشدين وضيافة.",
    answerEn:
      "Al-Zahim Palace stands beside the old town's main mosque and is over a century old. It was the home of Sheikh Abdullah bin Abdulwahhab bin Zahim, born in Al-Qasab, a judge who accompanied King Abdulaziz during the unification (including Hail and the Hijaz) and later headed the Sharia courts in Madinah, where he died in 1374 AH. The house served as the town court from 1380 AH, was restored in 1436 AH, and now displays documents and photos from the history of the Saudi state, open to visitors 4:30–9:30 pm, free (coordinating ahead is preferred), with guides and hospitality.",
    images: ZAHIM_IMAGES,
    mapsUrl: "https://maps.app.goo.gl/LG8vwuh1cFSnZYAC7",
  },
  {
    id: "qusaibi_building",
    titleAr: "مبنى القصبي التراثي",
    titleEn: "Al-Qusaibi heritage building",
    keywords: ["القصبي", "قصبي", "qusaibi"],
    answerAr:
      "مبنى القصبي التراثي يقع في قلب البلدة القديمة بالمنطقة المركزية لسوق العبيدي، وأدواره العلوية مفتوحة للزوار والمهتمين، وتشوف منه طابع البناء الطيني النجدي في وسط السوق. ما عندي تفاصيل أكثر موثقة عن تاريخ بنائه، وإذا تبي أدلّك على سوق العبيدي اللي هو فيه فأبشر.",
    answerEn:
      "The Al-Qusaibi heritage building sits in the heart of the old town, in the central area of Souq Al-Obaidi; its upper floors are open to visitors. I don't have more documented detail on its construction history, but I can guide you around Souq Al-Obaidi where it stands.",
  },
  {
    id: "obaidi_souq",
    titleAr: "سوق العبيدي",
    titleEn: "Souq Al-Obaidi",
    keywords: ["العبيدي", "عبيدي", "السوق القديم", "obaidi"],
    answerAr:
      "سوق العبيدي هو سوق القَصَب المركزي في البلدة القديمة قرب الجامع بحي القصر، والدكاكين تحيط فيه من كل الجهات إلا الجنوب، وتذكر المصادر إن تاريخه يرجع لأكثر من ٢٥٠ سنة، ويعد من أقدم أسواق نجد. حوله مباني تراثية مثل مبنى القصبي، ويتولاه اليوم بلدية القَصَب.",
    answerEn:
      "Souq Al-Obaidi is Al-Qasab's central market in the old town near the main mosque, in the Al-Qasr quarter, ringed by shops on every side but the south. Sources date it back more than 250 years, making it one of Najd's oldest markets. Heritage buildings such as the Al-Qusaibi building surround it.",
    images: [
      { src: "/images/places/souq-street.jpg", captionAr: "دكاكين سوق العبيدي بأعمدتها البيضاء وأبوابها الخشبية", captionEn: "The shops of Souq Al-Obaidi with white columns and wooden doors", credit: GM },
      { src: "/images/places/souq-mud-house.jpg", captionAr: "بيت طيني بزخارفه النجدية في سوق العبيدي", captionEn: "A mud-brick house with Najdi decoration in the souq", credit: GM },
      { src: "/images/places/souq-gate.jpg", captionAr: "بوابة طينية بشعار «ملح القصب» عند السوق", captionEn: "A mud gate with the «Malh Al-Qasab» logo by the souq", credit: GM },
    ],
    mapsUrl: "https://www.google.com/maps/place/%D8%B3%D9%88%D9%82+%D8%A7%D9%84%D8%B9%D8%A8%D9%8A%D8%AF%D9%8A+%D8%A7%D9%84%D8%AA%D8%B1%D8%A7%D8%AB%D9%8A+%D8%A8%D8%A7%D9%84%D9%82%D8%B5%D8%A8/@25.2991872,45.5063997,17z",
    coordinates: { lat: 25.2991872, lng: 45.5063997 },
  },
  {
    id: "rashid_house",
    titleAr: "منزل الراشد التراثي",
    titleEn: "Al-Rashid heritage house",
    keywords: ["الراشد", "راشد", "rashid"],
    answerAr:
      "منزل (قصر) الراشد التراثي في الجهة الجنوبية الغربية من البلدة، مبني على السور القديم ويضم أحد أبراجه، دورين فيها ١٤ غرفة و٢١ عمود حجري. استلمته هيئة السياحة والتراث عام ١٤٣٣هـ ورممته، وتشغّله بلدية القَصَب، ومجلسه مؤثث بأثاث شعبي. تشوفه من برا أي وقت، والدخول له بالمناسبات أو بدعوة رسمية.",
    answerEn:
      "The Al-Rashid heritage house sits on the southwestern edge of town, built into the old wall and including one of its towers: two floors, 14 rooms and 21 stone pillars. The heritage authority took it over and restored it from 1433 AH, and the municipality runs it with a traditionally furnished majlis. You can see it from outside any time; entry is for occasions or by official invitation.",
    images: [
      { src: "/images/places/rashid-sign.jpg", captionAr: "لوحة «بيت الراشد للتراث» على جداره الطيني", captionEn: "The «Al-Rashed House for Heritage» sign on its mud wall", credit: GM },
      { src: "/images/places/rashid-wall-towers.jpg", captionAr: "السور الطيني وأبراجه عند بيت الراشد", captionEn: "The mud wall and its towers by the Al-Rashid house", credit: GM },
    ],
    mapsUrl: "https://www.google.com/maps/place/%D8%A8%D9%8A%D8%AA+%D8%A7%D9%84%D8%B1%D8%A7%D8%B4%D8%AF+%D9%84%D9%84%D8%AA%D8%B1%D8%A7%D8%AB/@25.2978335,45.5067437,17z",
    coordinates: { lat: 25.2978335, lng: 45.5067437 },
  },
  {
    id: "old_town",
    titleAr: "البلدة القديمة",
    titleEn: "The old town",
    keywords: ["البلده القديمه", "الديره القديمه", "القريه التراثيه", "الديره التراثيه", "مدينه القصب التراثيه", "الطين", "طينيه", "heritage village", "old town"],
    answerAr:
      "البلدة القديمة (مدينة القَصَب التراثية) كلها بيوت طين نجدية وأزقة، وكان يحيط فيها سور «العَقْدة» وفي أركانها أبراج مراقبة. وفيها سوق العبيدي وقصر الزاحم ومنزل الراشد ومبنى القصبي، وفيها يقام موسم ملح القَصَب. تفتح من ٤ العصر إلى ١٠ الليل والدخول مجاني، وفيها ممشى حجري مضاء طوله ٧٠٠ متر، مشوار يومك كله تراث!",
    answerEn:
      "Al-Qasab's old town (the heritage town) is a maze of Najdi mud-brick houses and lanes, once ringed by the «Al-Aqda» wall with watchtowers at its corners. Souq Al-Obaidi, Al-Zahim Palace, the Al-Rashid house and the Al-Qusaibi building are here, and the Salt Season is held here. Open 4:00–10:00 pm, free, with a lit 700 m stone walkway.",
    images: [
      { src: "/images/places/village-gate-season.jpg", captionAr: "بوابة القرية التراثية بأبراجها أيام موسم ملح القَصَب", captionEn: "The heritage village gate and towers during the Salt Season", credit: GM },
      { src: "/images/places/village-corridor.jpg", captionAr: "ممر مسقوف بالخشب والجريد وأبوابه الخشبية في القرية التراثية", captionEn: "A wood-and-palm-roofed passage with wooden doors in the heritage village", credit: GM },
      { src: "/images/places/souq-street.jpg", captionAr: "دكاكين سوق العبيدي في قلب البلدة القديمة", captionEn: "The shops of Souq Al-Obaidi in the old town", credit: GM },
    ],
    mapsUrl: "https://maps.app.goo.gl/uadCKcKUxtJ74JwB7",
  },
  {
    id: "marqab",
    titleAr: "مرقب القَصَب",
    titleEn: "Al-Qasab watchtower",
    keywords: ["مرقب", "المرقب", "برج", "الثويليل", "watchtower", "marqab"],
    answerAr:
      "مرقب القَصَب برج طيني مخروطي على تل الثويليل شمال البلدة القديمة، يوصل طوله لحوالي ١٠ أمتار، وتشوفه من برا أي وقت ببلاش، بنوه أهل القَصَب يراقبون منه المنطقة ومواشيهم اللي ترعى قريب. يطلعه رجل يسمونه «الرقيب» من الصبح لين مغيب الشمس ومعه ماء وتمر، وإذا شاف شي يريبه نبّه أهل البلد وطلعوا للمكان اللي أشّر عليه.",
    answerEn:
      "The Al-Qasab marqab is a conical mud-brick watchtower about 10 m tall on Al-Thuwaylil hill north of the old town, free to view from outside at any time. A lookout called «Al-Raqib» climbed it from morning to sunset with water and dates to watch over the town and its grazing herds, and alerted the people if he saw danger.",
    mapsUrl: "https://maps.app.goo.gl/uvgxhJ1GbfRSQRr66",
    coordinates: { lat: 25.303187, lng: 45.509456 },
  },
  {
    id: "season_map",
    titleAr: "خريطة موسم ملح القَصَب ومحطاته",
    titleEn: "Salt Season map and stations",
    keywords: ["خريطه الموسم", "محطات", "مسار الموسم", "وش فيه الموسم", "وش في الموسم", "وش فيه بالموسم", "فعاليات الموسم", "فعاليات موسم", "برنامج الموسم", "مناطق الموسم", "ركن الطفل", "منطقه الطفل", "season map", "stations", "what's on", "whats on", "season program"],
    answerAr:
      "أبشر! هذا دليل مواقع الموسم تحت. الدخول والخروج من نفس البوابة، تبدأ من ١ مع الخط الأخضر وتتبع المسار الأزرق، والرحلة المقترحة:\n١ البوابة ← ٢ نفق تاريخ الملح (٢٥ متر) ← بوثات الرعاة ← ٣ عن موسم ملح القَصَب ← ٥ ماما نورة وسولت ← ١٤ بيوت الراشد ومدرسة البنات ← ٤ تاريخ القَصَب والشعر ← ٧ منطقة الطفل ← ٦ الكتاتيب ← ١٥ ديوانية المنيع ← ٨ المسرح ← ٩ أيادينا ← ١٩ المدرسة القديمة ← ١٨ دار حميدان الشويعر ← ١٠ الفن ← ١١ السوق (٢٠ ركن) ← ١٢ ألعاب وأطفال ← ١٣ الخروج.\nوبعد فيه ١٦ قصر الراشد و١٧ قصر الشيخ عبدالله بن عبدالوهاب الزاحم. شركاء الموسم: ماما نورة وSALT وهانوفيرين وVEO وLet's Play. وبرّا المسار: خيمة الضيافة، ومنطقة الطيور والخيول، ومطل دار القصبي ومطل الغدير، والكوفيهات، والمواقف.",
    answerEn:
      "Here is the season location key below. Entry and exit are through the same gate: start at 1 on the green line and follow the blue path. Suggested route:\n1 Gate → 2 Salt-history tunnel (25 m) → sponsors' booths → 3 About the Salt Season → 5 Mama Noura & Salt → 14 Al-Rashid houses & girls' school → 4 Al-Qasab's history and poetry → 7 Kids' zone → 6 Kuttab → 15 Diwaniyat Al-Manie → 8 Theatre → 9 «Ayadina» crafts → 19 Old school → 18 House of the poet Humaidan Al-Shuwai'ir → 10 Art → 11 Souq (20 stalls) → 12 Games & kids → 13 Exit.\nAlso on the map: 16 Al-Rashid palace and 17 Sheikh Abdullah bin Zahim's palace. Partners: Mama Noura, SALT, Hanoverian, VEO, Let's Play. Off the path: the hospitality tent, the birds and horses areas, the Dar Al-Qusaibi and Al-Ghadeer lookouts, coffee stalls and parking.",
    images: [
      { src: "/images/places/season-map-key.jpg", captionAr: "دليل مواقع موسم ملح القَصَب الرابع: المحطات والبيوت والخدمات", captionEn: "4th Salt Season location key: stations, houses and services" },
    ],
  },
  {
    id: "salt_extraction",
    titleAr: "كيف يستخرجون ملح القَصَب",
    titleEn: "How Al-Qasab salt is made",
    keywords: ["استخراج", "يستخرج", "يستخرجون", "يطلعون الملح", "يطلع الملح", "يسوون الملح", "ينتج الملح", "عين الجفر", "طريقه الملح", "تبخير", "how is the salt", "how salt is made", "extraction", "harvested"],
    answerAr:
      "أبشر، الملح يطلع من «الجِفار» كذا:\n١. صاحب المَمْلَحَة يحفر عين يسمونها «عين الجفر».\n٢. يبني جنبها خزان كبير من الطين أعلى شوي من الأرض عشان ينزل الماء المالح للبرك.\n٣. يجهّز برك جنب الخزان، متوسطة العمق وأطوالها مختلفة.\n٤. يضخ الماء من الجفر بالمضخات للخزان، ومن الخزان للبرك، ويزيده كل يوم.\n٥. يتبخر الماء ويترسب الملح طبقة بيضاء سميكة على وجه البركة.\nالعملية تاخذ من شهرين إلى أربعة شهور حسب الحرارة وقوة الهوا. وقديم كانوا يستخرجونه باليد بتعب وتكلفة، واليوم المضخات والمعدات خففت الشغل.",
    answerEn:
      "Salt is made at «Al-Jifar» like this:\n1. The pan owner digs a well called «Ain Al-Jafr».\n2. Beside it he builds a large mud tank, a little above ground so the brine flows to the pools.\n3. Medium-deep pools of different lengths are prepared next to the tank.\n4. Pumps lift the brine from the well into the tank and on into the pools, topped up daily.\n5. The water evaporates and the salt settles as a thick white crust on the surface.\nIt takes two to four months depending on the heat and the wind. It used to be hard, costly hand work; pumps and machinery have made it much lighter.",
    images: MAMLAHA_VISITOR_IMAGES.slice(0, 2),
  },
  {
    id: "salt_economy",
    titleAr: "اقتصاد ملح القَصَب",
    titleEn: "The Al-Qasab salt economy",
    keywords: ["انتاج الملح", "كم ينتج", "كم تنتج", "اقتصاد", "مبيعات", "كم طن", "سوق الملح", "salt production", "how much salt", "economy", "sales"],
    answerAr:
      "ملح القَصَب ذهب أبيض صدق: المملكة تنتج تقريباً ٢٠٠ ألف طن ملح بالسنة، والقَصَب تغطي قرابة الثلث (٣٠٪) من احتياج السوق السعودي من ملح الطعام، ومبيعاتها تتعدى ٢٠٠ مليون ريال بالسنة (قرابة ٥٪ من قيمة إنتاج الملح الوطني اللي يقدّر بـ٣٫٧ مليار ريال، حسب واس ٢٠٢٥). ووزارة الصناعة والثروة المعدنية مخصصة مجمع تعديني لخام الملح في القَصَب مساحته ٣٣٫١٥ كيلو متر مربع.",
    answerEn:
      "Al-Qasab salt really is white gold: Saudi Arabia produces about 200,000 tonnes of salt a year, and Al-Qasab covers roughly a third (30%) of the Saudi market's table-salt needs, with sales above SAR 200 million a year (about 5% of the national salt output value of ~SAR 3.7 billion, per SPA 2025). The Ministry of Industry and Mineral Resources has set aside a 33.15 km² salt-ore mining complex in Al-Qasab.",
  },
  {
    id: "salt_history",
    titleAr: "تاريخ الملح",
    titleEn: "The history of salt",
    keywords: ["تاريخ الملح", "تاريخ ملح", "الملح عبر", "الحضارات", "الفراعنه", "الرومان", "الهمداني", "ياقوت", "history of salt", "salt history"],
    answerAr:
      "ملح القَصَب مذكور من قديم: الهمداني عدّ «ملح القُصَيبة» من أهم ممالح الجزيرة في «صفة جزيرة العرب»، وياقوت الحموي ذكر «سبخة القُصَيبة» اللي «يؤخذ منها الملح» وتنحدر لها الأودية. وعلى مستوى العالم، الإنسان عرف الملح من حوالي عشرة آلاف سنة يحفظ فيه السمك واللحم: في بلغاريا «بلدة الملح» من ٤٧٠٠ قبل الميلاد، والفراعنة أول من ملّحوا اللحم، والصينيون وثّقوه في الأكل ٢٦٧٠ قبل الميلاد، والرومان سوّوا له طرق خاصة. وفي أوروبا انفرضت عليه ضرايب مثل «الغابيل» الفرنسية، وكبر ميناء ليفربول بسبب تجارته.",
    answerEn:
      "Al-Qasab salt has old roots: al-Hamdani listed «the salt of Al-Qusaiba» among Arabia's main salt sources in «Sifat Jazirat al-Arab», and Yaqut al-Hamawi described «the sabkha of Al-Qusaiba» where «salt is taken» and valleys drain into it. Worldwide, people have used salt for about 10,000 years to preserve fish and meat: Bulgaria's «salt town» Solnitsata dates to 4700 BC, the ancient Egyptians were the first to cure meat with salt, China recorded salt in food in 2670 BC, and Rome built roads to carry it. Europe taxed it (France's famous «gabelle»), and salt trade turned Liverpool into an international port.",
  },
  {
    id: "qasab_history",
    titleAr: "تاريخ القَصَب",
    titleEn: "The history of Al-Qasab",
    keywords: ["تاريخ القصب", "تاريخ مدينه القصب", "حرب البسوس", "البسوس", "القصيبات", "قوافل الحجاج", "الحجاج", "الدوله السعوديه الاولي", "قصبات", "ذو الرمه", "history of al-qasab", "basus"],
    answerAr:
      "القَصَب تاريخها عريق يا بعد حيي: معروفة من العصر الجاهلي، وكانت عدة «قصبات» مثل قصبة الملح وقصبة الرمادة اللي ذكرها ذو الرُّمّة في شعره، وبعدين اجتمع الناس في البلدة الحالية وبنوا أبراج للمراقبة. ومن أقدم أحداثها «يوم القُصَيبات» في حرب البسوس، وجزم الهمداني إنه صار فيها. وكانت محطة لقوافل الحجاج الجايين من البصرة على «طريق المنكدر»، ووصفها الأصفهاني بأنها «قرية عظيمة». ودخلت تحت راية الدولة السعودية الأولى، وزارها الملك عبدالعزيز ١٣٢١هـ، والملك سعود ١٣٧٤هـ، والملك سلمان ١٣٩٢هـ لما كان أمير الرياض.",
    answerEn:
      "Al-Qasab is known since pre-Islamic times. It began as several «qasabat» (hamlets) such as Qasabat Al-Milh and Qasabat Al-Ramada, the latter named by the poet Dhu al-Rumma, before people gathered in today's town and built watchtowers. One of its oldest events is «the Day of Al-Qusaibat» in the War of Al-Basus, which al-Hamdani placed here. It was a stop for pilgrim caravans from Basra on the «Al-Munkadir road», described as «a great village». It joined the First Saudi State, and was visited by King Abdulaziz (1321 AH), King Saud (1374 AH) and King Salman (1392 AH, as Governor of Riyadh).",
  },
  {
    id: "gates",
    titleAr: "أبواب القَصَب وسورها",
    titleEn: "Al-Qasab's gates and wall",
    keywords: ["ابواب", "بوابات", "باب الحوطه", "المجيبيب", "النقبه", "ام طليحه", "اللطيفيه", "باب البرج", "العقده", "سور البلد", "سور القصب", "السور", "gates", "town wall"],
    answerAr:
      "القَصَب كان يحيط فيها سور طين يسمونه «العَقْدة»، وأبوابها القديمة ثلاث: «باب الحوطة» غرب يطلعون منه للمزارع الغربية، و«باب المُجَيبيب» شرق وسُمي كذا لأن داخله مِجباب، و«باب البرج» شمال جنب برج مراقبة. وبعد ما جا الملك عبدالعزيز وأمنت البلد انفتح «باب النَّقْبة» غرب (فتحة كبيرة في السور) و«باب أم طليحة» شرق (جنب شجرة طلح)، وبعد إنشاء البلدية ١٤٠١هـ انفتح «باب اللطيفية» جنوب والمدخل الغربي. وتلقى منطقة «أبواب القَصَب» التفاعلية في الموسم.",
    answerEn:
      "Al-Qasab was ringed by a mud wall called «Al-Aqda» with three old gates: «Bab Al-Hawta» to the west (out to the western farms), «Bab Al-Mujaibib» to the east, and «Bab Al-Burj» to the north beside a watchtower. After King Abdulaziz's arrival brought security, «Bab Al-Naqba» (a wide opening in the wall, west) and «Bab Umm Tulaiha» (by an acacia tree, east) were opened, and after the municipality was founded in 1401 AH came «Bab Al-Latifiya» (south) and the western entrance. The Salt Season has an interactive «Gates of Al-Qasab» area.",
    images: [
      { src: "/images/places/village-gate-season.jpg", captionAr: "بوابة القرية التراثية بأبراجها", captionEn: "The heritage village gate and towers", credit: GM },
    ],
  },
  {
    id: "qarraya",
    titleAr: "القرّاية (الكتاتيب)",
    titleEn: "The kuttab schools (Al-Qarraya)",
    keywords: ["القرايه", "قرايه", "الكتاتيب", "كتاتيب", "التعليم", "المطوع", "المدرسه القديمه", "معلمين", "المعلمين", "معلمات", "kuttab", "education", "teachers"],
    answerAr:
      "قبل التعليم النظامي كان أهل القَصَب يتعلمون في «القرّاية» أو «الكتاتيب»: المعلّم يسمونه «المقرئ» أو «المطوّع»، يحفّظ الطلاب القرآن والأحاديث ويعلمهم القراية والكتابة، والبنات تعلّمهم «المطوّعة». واستمر كذا لين بدأ التعليم النظامي عام ١٣٧٤هـ (١٩٥٥م). ومن أبرز اللي علّموا أهل القَصَب من الرجال: عثمان بن منيع، وعبدالله بن محمد الراشد، وسليمان بن قاسم، وإبراهيم بن ناصر بن سويد، وعبدالله بن عثمان الراشد، وعبدالعزيز بن محمد بن محارب (الحريبي)، ومحمد بن عبدالله السياري، وسعد بن شويرخ، وعثمان بن عبدالله الراشد، وعبدالعزيز بن عثمان بن عوجان، وإبراهيم بن عبدالعزيز الحميضي، وعبدالله بن عبدالعزيز بن محارب. ومن النساء: هيا بنت إبراهيم الحميضة، ومنيرة بنت راشد محمد الراشد، وهيلة المقحم، وهيا بنت محمد السياري، ونورة بنت عبدالله الشعلان، ونورة بنت عبدالله الهديب (أم هديب)، وسارة بنت عبدالله النمي، ومنيرة بنت راشد عبدالله الراشد. وفي الموسم تنفتح غرفة الكتاتيب تكريماً للمعلمين اللي أناروا عقول أهل القَصَب.",
    answerEn:
      "Before formal schooling, Al-Qasab learned in «Al-Qarraya», the kuttab: a teacher called «Al-Muqri» or «Al-Mutawwa» taught the Quran, hadith, reading and writing, and girls were taught by «Al-Mutawwa'a». Formal education began in 1374 AH (1955). The season file lists the teachers by name (in Arabic), e.g. Othman bin Manie and Abdullah bin Muhammad Al-Rashid among the men, and Haya bint Ibrahim Al-Humaidha among the women. During the Salt Season the kuttab room opens to honour those teachers.",
  },
  {
    id: "akrashiya",
    titleAr: "روضة العكرشية",
    titleEn: "Rawdat Al-Akrashiya",
    keywords: ["العكرشيه", "عكرشيه", "روضه", "akrashiya", "rawdat"],
    answerAr:
      "روضة العكرشية شمال غرب القَصَب، ويشقها طريق المجمعة، وهي من أكبر رياض نجد وأهمها: أرضها منبسطة ما فيها مرتفعات، فإذا جا السيل ينتشر الماء في مساحة توصل ١٢ مليون متر مربع، وربيعها يجنن بعد المطر، وأحلى وقت لها الشروق والغروب. فيها مواقف ومسجد ودورات مياه للرجال والنساء وجلسات مظللة، ومفتوحة ٢٤ ساعة ببلاش.",
    answerEn:
      "Rawdat Al-Akrashiya lies northwest of Al-Qasab, crossed by the road to Al-Majma'ah. It is one of Najd's largest and most important meadows: the land is flat, so after rain the water spreads over up to 12 million m², and it turns green and lush in spring (best at sunrise or sunset). It has parking, a mosque, men's and women's restrooms and shaded seating; open 24 hours, free.",
    mapsUrl: "https://maps.app.goo.gl/Dn6f7fPwpC25hhBz7",
    coordinates: { lat: 25.3407898, lng: 45.3647892 },
  },
  {
    id: "poetry",
    titleAr: "شعر القَصَب (ملح القصيد)",
    titleEn: "Al-Qasab's poetry («Salt of Poetry»)",
    keywords: ["شعر", "شاعر", "قصيد", "قصايد", "قصائد", "حميدان", "الشويعر", "العجيمي", "ابن قعيد", "جبر بن سيار", "سهيل المقحم", "poet", "poetry", "poem"],
    answerAr:
      "القَصَب بلاد الملح والشعر! أشهر شعرائها حميدان الشويعر (توفي حوالي ١٢٠٠هـ)، صاحب البيت الخالد: «تموت الأفاعي وسمّها في نحورها … وكم من قريسٍ مات ما شاف قارسه»، ومن شعراها بعد: جبر بن سيار (توفي ١٠٨٥هـ)، ومحمد بن ناصر بن غانم، وعبدالله بن قعيّد، ومحمد بن عبدالعزيز الماجد «العجيمي»، وإبراهيم الحميضي «أبو عادل»، ومحمد المقحم، وعبدالعزيز بن محمد المقحم «سهيل» اللي قال: «بلدنا تنتج الملح الذهب تشهد لنا الأجناب … كثيرٍ من الصناعة ما تتمّ إلا وهو فيها». وفي الموسم قسم «ملح القصيد» فيه أبيات على الجدران ورواة يرددون القصايد. وفيها شعراء كثير غيرهم.",
    answerEn:
      "Al-Qasab is the land of salt and poets! Its most famous poet is Humaidan Al-Shuwai'ir (d. c. 1200 AH), known for sharp wisdom and satire; others include Jabr bin Sayyar (d. 1085 AH), Muhammad bin Nasser bin Ghanim, Abdullah bin Qu'ayyid, Muhammad bin Abdulaziz Al-Majid «Al-Ujaimi», Ibrahim Al-Humaidhi «Abu Adel», Muhammad Al-Muqhim and Abdulaziz bin Muhammad Al-Muqhim «Suhail», who wrote that the town «produces salt, the gold others vouch for, and many industries can't do without it». The Salt Season's «Salt of Poetry» section puts verses on the walls with narrators reciting them.",
  },
  {
    id: "proverbs",
    titleAr: "أمثال القَصَب الشعبية",
    titleEn: "Al-Qasab folk proverbs",
    keywords: ["امثال", "مثل شعبي", "الامثال", "الامثله الشعبيه", "proverb"],
    answerAr:
      "من أمثال القَصَب الشعبية: «كمن أهدى الملح على أهل القَصَب» يعني اللي يجيب الشي لأهله وهم أغنى الناس فيه، و«انكبّ الملح»، و«حِطَّني تلقاني»، و«حَرِّك تَبْلَش»، و«سلِّفني وألاعبك»، و«حلوم ليل»، و«طِقّ ومات».",
    answerEn:
      "Among Al-Qasab's folk proverbs: «Like giving salt as a gift to the people of Al-Qasab», i.e. bringing something to those who have the most of it (like coals to Newcastle), as well as «The salt got spilled», «Put me down and you'll find me» and «Night dreams».",
  },
  {
    id: "mosques",
    titleAr: "المساجد في القَصَب",
    titleEn: "Mosques in Al-Qasab",
    keywords: ["مسجد", "مساجد", "جامع", "اصلي", "صلاه", "مصلي العيد", "mosque", "pray"],
    answerAr:
      "أبشر، هذي أبرز مساجد القَصَب على الخريطة تحت (الدبابيس الخضراء):\n• مسجد الشعبة، جنب القرية التراثية وأرض الموسم، أقربها لك وأنت تتجول.\n• جامع الملك عبدالعزيز.\n• مسجد البلدية، ومسجد أبو بكر الصديق، ومسجد ابن باز، ومسجد الشيخ محمد بن عبدالوهاب، ومسجد الإحسان.\n• ومصلى العيد بمركز القَصَب.\nوإذا رحت روضة العكرشية فيها مسجد بعد. اضغط «خذني له» جنب أي مسجد.",
    answerEn:
      "Here are Al-Qasab's main mosques, pinned in green on the map below:\n• Al-Shu'ba Mosque, next to the heritage village and the season grounds, the nearest while you walk around.\n• King Abdulaziz Mosque.\n• The Municipality Mosque, Abu Bakr Al-Siddiq Mosque, Ibn Baz Mosque, Sheikh Muhammad bin Abdulwahhab Mosque and Al-Ihsan Mosque.\n• The Eid prayer ground.\nRawdat Al-Akrashiya also has a mosque. Tap «Take me there» next to any of them.",
  },
  {
    id: "restrooms",
    titleAr: "دورات المياه",
    titleEn: "Restrooms",
    keywords: ["دوره مياه", "دورات مياه", "دورات المياه", "دوره المياه", "حمامات", "وين الحمام", "تواليت", "مرحاض", "toilet", "restroom", "bathroom", "wc"],
    answerAr:
      "ما فيه دورات مياه عامة مسجّلة داخل البلد، بس أقرب شي لك دورات مياه المساجد: مسجد الشعبة جنب القرية التراثية وأرض الموسم، ومسجد البلدية. وفي روضة العكرشية دورات مياه للرجال والنساء. وأيام الموسم اسأل في منطقة التسجيل أو خيمة الضيافة عن أقرب دورات مياه. تلقاها على الخريطة تحت (الدبابيس الزرقاء).",
    answerEn:
      "There are no public toilets listed inside the town; the nearest are the mosque facilities: Al-Shu'ba Mosque next to the heritage village and the season grounds, and the Municipality Mosque. Rawdat Al-Akrashiya has men's and women's restrooms. During the Salt Season, ask at the registration area or the hospitality tent for the nearest ones. They're pinned in blue on the map below.",
  },
  {
    id: "official_site",
    titleAr: "الموقع الرسمي لمدينة القَصَب",
    titleEn: "Al-Qasab official city guide",
    keywords: ["الموقع الرسمي", "موقع رسمي", "القصب الرسمي", "الرسمي للقصب", "qasabcity", "دليل مدينه القصب", "موقع المدينه", "official site", "official website", "website"],
    answerAr:
      "الموقع الرسمي لمدينة القَصَب هو qasabcity.com (دليل مدينة القَصَب): فيه نبذة عن البلد، والأماكن اللي تستاهل الزيارة بأوقاتها ومواقعها، وموسم ملح القَصَب وتسجيل التذاكر والعارضين، ومعلومات عن ملح القَصَب، والفعاليات على مدار السنة. وللتواصل: info@qasabsaltseason.com.",
    answerEn:
      "Al-Qasab's official city guide is qasabcity.com: an overview of the town, places to visit with opening hours and map links, the Salt Season with ticket and exhibitor registration, Al-Qasab salt, and events through the year. Contact: info@qasabsaltseason.com.",
    link: OFFICIAL_SITE,
  },
  {
    id: "king_salman_park",
    titleAr: "حديقة الملك سلمان",
    titleEn: "King Salman Park",
    keywords: ["حديقه الملك سلمان", "حديقه", "حدائق", "منتزه عائلي", "park"],
    answerAr:
      "حديقة الملك سلمان على طريق الملك عبدالله في القَصَب، مفتوحة ٢٤ ساعة ببلاش: جلسات عائلية وممرات مشي وملاعب. وفي الشتاء (ديسمبر إلى فبراير) تقام فيها «كشتة» الخميس والجمعة بمسابقات طبخ وتصوير وأزياء وبلوت.",
    answerEn:
      "King Salman Park on King Abdullah Road is open 24 hours and free, with family seating, walking paths and sports areas. In winter (December–February) it hosts the «Kashta» on Thursdays and Fridays, with cooking, photo, costume and Baloot contests.",
    mapsUrl: "https://maps.app.goo.gl/3CFisYaoQX57m66g8",
    coordinates: { lat: 25.3037518, lng: 45.5331749 },
  },
  {
    id: "art_club",
    titleAr: "النادي التشكيلي بالقَصَب (السريالي)",
    titleEn: "Al-Qasab art club (Surrealist)",
    keywords: ["السريالي", "النادي التشكيلي", "معرض فني", "فن تشكيلي", "art club", "gallery"],
    answerAr:
      "النادي التشكيلي بالقَصَب (السريالي) معرض فني في سوق القرية التراثية، يفتح من ٧ الصبح إلى ٨ الليل والدخول مجاني، والأفضل تنسّق قبل زيارتك.",
    answerEn:
      "The Al-Qasab art club («Surrealist») is a gallery in the heritage village market, open 7:00 am–8:00 pm, free; coordinating ahead is preferred.",
    mapsUrl: "https://maps.app.goo.gl/vDMpXwH5WwAegzcS9",
    coordinates: { lat: 25.2989471, lng: 45.5053567 },
  },
  {
    id: "burdan_lake",
    titleAr: "الواحة الخضراء (بحيرة برودان)",
    titleEn: "The Green Oasis (Burdan lake)",
    keywords: ["برودان", "الواحه الخضراء", "بحيره", "lake", "oasis"],
    answerAr:
      "الواحة الخضراء (بحيرة برودان) واحة فيها ماء دايم، مفتوحة ٢٤ ساعة ببلاش. انتبه: آخر ٤ كيلو تقريباً طريق ترابي وعر.",
    answerEn:
      "The Green Oasis (Burdan lake) has water all year round, open 24 hours, free. Note: the last ~4 km is a rough unpaved track.",
    mapsUrl: "https://maps.app.goo.gl/QvKobNXXtFv2QZVXA",
    coordinates: { lat: 25.189667, lng: 45.62025 },
  },
  {
    id: "nafud",
    titleAr: "نفود القَصَب وجبل الفهدة",
    titleEn: "The Nafud dunes and Jabal Al-Fahda",
    keywords: ["النفود", "نفود", "الطعوس", "رمال", "جبل الفهده", "الفهده", "dunes", "nafud"],
    answerAr:
      "النفود كثبان رملية غرب القَصَب، وجبل الفهدة جبل وسط رمال الرغام، والاثنين مفتوحين ٢٤ ساعة ببلاش، ويُنصح بسيارة دفع رباعي.",
    answerEn:
      "The Nafud are sand dunes west of Al-Qasab, and Jabal Al-Fahda is a mountain amid the Al-Raghaam sands; both open 24 hours, free, and a 4x4 is recommended.",
    mapsUrl: "https://maps.app.goo.gl/iDJcPezDivs5koR3A",
    coordinates: { lat: 25.191118, lng: 45.520565 },
  },
  {
    id: "shafei_park",
    titleAr: "منتزه الشفيعي",
    titleEn: "Al-Shafei park",
    keywords: ["الشفيعي", "شفيعي", "طويق", "shafei"],
    answerAr:
      "منتزه الشفيعي في جبال طويق، جزء من منتزه القَصَب الوطني، على بعد حوالي ٢٤ كيلو بطريق ترابي، مفتوح ٢٤ ساعة ببلاش. وفيه غار الشفيعي اللي تغنّى فيه الشعراء.",
    answerEn:
      "Al-Shafei park lies in the Tuwaiq mountains, part of Al-Qasab National Park, about 24 km away on an unpaved road; open 24 hours, free.",
    mapsUrl: "https://maps.app.goo.gl/DJZuMn5QfV5ZwbRE6",
    coordinates: { lat: 25.4049078, lng: 45.5720615 },
  },
  {
    id: "birds_museum",
    titleAr: "متحف ومحمية طيور الوشم",
    titleEn: "Al-Washm bird museum and reserve",
    keywords: ["طيور الوشم", "محميه الطيور", "محميه طيور", "متحف الطيور", "متحف", "محميه", "bird museum", "bird reserve", "museum"],
    answerAr:
      "متحف ومحمية طيور الوشم يفتح من ٧ الصبح إلى ٨ الليل برسوم رمزية، ولازم تحجز قبل ٢٤ ساعة.",
    answerEn:
      "The Al-Washm bird museum and reserve opens 7:00 am–8:00 pm for a nominal fee; book 24 hours ahead.",
    mapsUrl: "https://maps.app.goo.gl/TAgSiBvds2RoSUsM6",
    coordinates: { lat: 25.2546554, lng: 45.4738085 },
  },
  {
    id: "events",
    titleAr: "فعاليات القَصَب على مدار السنة",
    titleEn: "Al-Qasab events through the year",
    keywords: ["شتويه القصب", "شتويه", "كشته", "يوم التاسيس", "اليوم الوطني", "اسبوع البيئه", "عيد الفطر", "فعاليات السنه", "مدار السنه", "طول السنه", "events"],
    answerAr:
      "غير موسم الملح، القَصَب فيها فعاليات طول السنة:\n• شتوية القَصَب من ١ يناير إلى ١ مارس، والدخول مجاني.\n• الكشتة في حديقة الملك سلمان الخميس والجمعة من ديسمبر إلى فبراير.\n• يوم التأسيس ٢٢–٢٣ فبراير.\n• فعاليات عيد الفطر.\n• أسبوع البيئة كل سنة بين أبريل ومايو.\n• اليوم الوطني ٢٣ سبتمبر، تبدأ الفعاليات بعد العصر في القرية التراثية.\nوكلها ببلاش.",
    answerEn:
      "Besides the Salt Season, Al-Qasab has events all year:\n• Qasab Winter, 1 January–1 March, free.\n• The Kashta in King Salman Park, Thursdays and Fridays, December–February.\n• Founding Day, 22–23 February.\n• Eid Al-Fitr celebrations.\n• Environment Week, yearly in April–May.\n• National Day, 23 September, from after Asr in the heritage village.\nAll free.",
    link: OFFICIAL_SITE,
  },
  {
    id: "season",
    titleAr: "موسم ملح القَصَب",
    titleEn: "Al-Qasab Salt Season",
    keywords: ["موسم", "مهرجان", "فعاليات", "festival", "season", "event grounds"],
    answerAr:
      "موسم ملح القَصَب الرابع من ١٩ إلى ٢٨ نوفمبر ٢٠٢٦ بإذن الله في مدينة القَصَب التراثية، يومياً من ٤ العصر إلى ١١ الليل، والدخول مجاني: سجّل زيارتك وخذ تذكرتك من qasab-tickets.pages.dev (تذكرة وحدة لك ولمرافقيك). الموسم يحتفي بإرث القَصَب في إنتاج الملح الطبيعي، وفيه المَمْلَحَة النموذجية وجناح ملح القَصَب ومحطة تاريخ الملح وأبواب القَصَب والقرّاية (الكتاتيب) و«ملح القصيد»، والأسر المنتجة والمطاعم والمقاهي، وبطولة فروسية وسيارات كلاسيكية وركن للطفل. نسخه السابقة: الأولى ٢–١١ مارس ٢٠٢٣ (٨٣ ألف زائر)، والثانية ٢–١٠ فبراير ٢٠٢٤ (٩٢ ألف)، والثالثة ٢٠–٢٧ فبراير ٢٠٢٥ (فوق ١٠٠ ألف)، والمتوقع هالسنة ١١٠ إلى ١٣٠ ألف زائر و٤٠ إلى ٥٠ عارض. وللتواصل: المدير التنفيذي المهندس محمد بن سعد القصيّب، جوال 0505807840، بريد ceo@qasabseason.com، وحساب الموسم @qasabsaltseason.",
    answerEn:
      "The 4th Al-Qasab Salt Season runs 19–28 November 2026 in Al-Qasab's heritage town, daily 4:00–11:00 pm, with free entry: register and get your ticket at qasab-tickets.pages.dev (one ticket covers you and your companions). It celebrates the town's natural-salt heritage with the model salt pan, the Al-Qasab salt pavilion, the salt-history station, Al-Qasab's gates, the old kuttab school and «Salt of Poetry», plus family producers, restaurants and cafes, an equestrian championship, classic cars and a kids' corner. Past editions: 2–11 March 2023 (83,793 visitors), 2–10 February 2024 (92,000) and 20–27 February 2025 (100,000+); 110,000–130,000 visitors and 40–50 exhibitors are expected this year. Contact: executive director Eng. Muhammad bin Saad Al-Qusayyib, mobile 0505807840, ceo@qasabseason.com; Instagram @qasabsaltseason.",
    images: [
      { src: "/images/places/season-sign.jpg", captionAr: "لوحة «موسم ملح القصب» في أرض الموسم", captionEn: "The «Al-Qasab Salt Season» sign at the grounds", credit: GM },
      { src: "/images/places/village-gate-season.jpg", captionAr: "بوابة القرية التراثية بشعار ملح القصب وقت الموسم", captionEn: "The heritage village gate with the Malh Al-Qasab logo during the season", credit: GM },
    ],
    mapsUrl: "https://maps.app.goo.gl/ANX6a26KTspG5we88",
  },
  {
    id: "town",
    titleAr: "مدينة القَصَب",
    titleEn: "Al-Qasab town",
    keywords: ["عن القصب", "مدينه القصب", "بلده القصب", "وين القصب", "كم تبعد القصب", "تعريف", "نبذه"],
    answerAr:
      "القَصَب من أقدم بلدات الوشم في نجد، تتبع محافظة شقراء بمنطقة الرياض، على بعد حوالي ١٦٠ كيلو شمال غرب الرياض، شرق ضلع طويق وغرب نفود عريق البلدان وجنوب روضة العكرشية، وترتفع ٦٧١ متر عن سطح البحر. معروفة من العصر الجاهلي وذكرها ياقوت الحموي، وكانت في الأصل عدة «قصبات» مثل قصبة الطرفاء وقصبة الملح وقصبة الرمادة، واشتهرت بالبر والملح، وتسمى «مدينة الذهب الأبيض» و«بلدة الملح والشعراء». فيها مَمَالح الجِفار والصْبَخَة، والبلدة القديمة بسوق العبيدي وقصورها التراثية، ومرقبها.",
    answerEn:
      "Al-Qasab is one of the oldest towns of Al-Washm in Najd, part of Shaqra Governorate in the Riyadh Region, about 160 km northwest of Riyadh, east of the Tuwaiq escarpment, west of the Uraiq Al-Buldan dunes and south of Rawdat Al-Akrashiya, 671 m above sea level. Known since pre-Islamic times and mentioned by Yaqut al-Hamawi, it began as several «qasabat» (hamlets) such as Qasabat Al-Milh and Qasabat Al-Ramada; it was known for wheat and salt and is called the 'City of White Gold' and the 'town of salt and poets'.",
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
  // General topics (overviews, season, town) only when no specific place matches
  const general = new Set(["heritage_places", "tourist_places", "season", "town"]);
  const ordered = [...PLACE_TOPICS].sort((a, b) => (general.has(a.id) ? 1 : 0) - (general.has(b.id) ? 1 : 0));
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
// Greeting with nothing else: return it, introduce «الداهية» and offer the three options
// (they also appear as buttons under the reply, see GREETING_OPTIONS).
const GREETING_OPENERS_AR_SALAM = [
  "وعليكم السلام ورحمة الله وبركاته، حيّاك الله في ديرتنا القَصَب!",
  "وعليكم السلام ورحمة الله وبركاته، يا هلا ومسهلا، نوّرت القَصَب!",
];
const GREETING_OPENERS_AR = ["يا هلا والله ومسهلا، حيّاك الله في القَصَب!", "يا مرحبا وألف هلا، نوّرت القَصَب!"];
const GREETING_MENU_AR =
  "أنا «الداهية»، مرشدك السياحي في القَصَب. وش تبي أخدمك فيه؟\n" +
  "١. معلومات عن موسم ملح القَصَب\n" +
  "٢. الأماكن التراثية في القَصَب\n" +
  "٣. الأماكن السياحية ومواقعها على الخريطة التفاعلية\n" +
  "اختر من الأزرار تحت، أو اسألني اللي في خاطرك.";
const GREETING_MENU_EN =
  "I'm «Al-Dahiya», your tour guide in Al-Qasab. How can I help?\n" +
  "1. The Al-Qasab Salt Season\n" +
  "2. Heritage places in Al-Qasab\n" +
  "3. Tourist places and their locations on the interactive map\n" +
  "Pick one below, or ask me anything.";

/** The three options as tappable questions (each has a real answer). */
export const GREETING_OPTIONS: Record<"ar" | "en", string[]> = {
  ar: ["حدثني عن موسم ملح القصب", "وش الأماكن التراثية في القصب؟", "وين الأماكن السياحية في القصب على الخريطة؟"],
  en: ["Tell me about the Al-Qasab Salt Season", "What are the heritage places in Al-Qasab?", "Show me the tourist places in Al-Qasab on the map"],
};

const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

/** Reply to a greeting: «وعليكم السلام» only when the visitor actually said salam. */
export function pickSalamReply(lang: "ar" | "en" = "ar", userSaidSalam = true): string {
  if (lang === "ar") return `${pick(userSaidSalam ? GREETING_OPENERS_AR_SALAM : GREETING_OPENERS_AR)} ${GREETING_MENU_AR}`;
  return `${userSaidSalam ? "Wa alaykum assalam, welcome to Al-Qasab!" : "Hello, welcome to Al-Qasab!"} ${GREETING_MENU_EN}`;
}

/** Short greeting to put in front of an answer when the user opened with «السلام عليكم» plus a question. */
export const SALAM_PREFIX_AR = "وعليكم السلام ورحمة الله وبركاته، حيّاك الله في ديرتنا..";
export const SALAM_PREFIX_EN = "Wa alaykum assalam, welcome to Al-Qasab!";

// Facts block for the system prompts
export const GUIDE_FACTS_AR = PLACE_TOPICS.map(t => `- **${t.titleAr}:** ${t.answerAr}`).join("\n");
export const GUIDE_FACTS_EN = PLACE_TOPICS.map(t => `- ${t.titleEn}: ${t.answerEn}`).join("\n");
