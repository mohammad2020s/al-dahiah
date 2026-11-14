// The official map of the 4th Al-Qasab Salt Season (A2 PDF, 10 Nov 2026): its stations, services and
// the visit route, in the PDF's own coordinates (points, 1684 × 1191). Used by the chat (to attach the map
// when someone asks where something is) and by the map viewer (pins, «أنت هنا», route and directions).

export const VENUE_MAP = {
  width: 1684,
  height: 1191,
  image: "/images/season-map.webp",
  thumb: "/images/season-map-thumb.webp",
  pdf: "/maps/season-map-a2.pdf",
};

export type VenueKind = "station" | "house" | "service" | "cafe";
export type VenueNode = { id: string; no?: number; ar: string; en: string; x: number; y: number; kind: VenueKind; aliases: string[] };

// Numbers 1–11 are the visit order; 12–22 are houses and landmarks on the map.
export const VENUE_NODES: VenueNode[] = [
  { id: "1", no: 1, ar: "نفق تاريخ الملح (٢٥م)", en: "Salt History Tunnel (25 m)", x: 1257, y: 715, kind: "station", aliases: ["نفق تاريخ الملح", "النفق", "نفق الملح", "tunnel"] },
  { id: "2", no: 2, ar: "عن موسم ملح القصب", en: "About the Salt Season", x: 1241, y: 611, kind: "station", aliases: ["عن موسم ملح القصب", "عن الموسم"] },
  { id: "3", no: 3, ar: "تاريخ القصب والشعر", en: "Al-Qasab History & Poetry", x: 1403, y: 537, kind: "station", aliases: ["تاريخ القصب والشعر", "القصب والشعر", "history and poetry"] },
  { id: "4", no: 4, ar: "ماما نورة وسولت", en: "Mama Noura & SALT", x: 1514, y: 472, kind: "station", aliases: ["ماما نوره", "سولت", "mama noura"] },
  { id: "5", no: 5, ar: "الكتاتيب", en: "Al-Katateeb (old Quran school)", x: 1284, y: 449, kind: "station", aliases: ["الكتاتيب", "كتاتيب", "katateeb"] },
  { id: "6", no: 6, ar: "المسرح", en: "The Theatre", x: 1163, y: 312, kind: "station", aliases: ["المسرح", "مسرح", "theatre", "theater", "stage"] },
  { id: "7", no: 7, ar: "أيادينا", en: "Ayadina (handicrafts)", x: 819, y: 404, kind: "station", aliases: ["ايادينا", "ayadina"] },
  { id: "8", no: 8, ar: "متحف الشاي", en: "Tea Museum", x: 920, y: 196, kind: "station", aliases: ["متحف الشاي", "tea museum"] },
  { id: "9", no: 9, ar: "شارع الفن", en: "Art Street", x: 359, y: 407, kind: "station", aliases: ["شارع الفن", "art street"] },
  { id: "10", no: 10, ar: "سوق العبيدي", en: "Al-Obaidi Souq", x: 602, y: 495, kind: "station", aliases: ["سوق العبيدي", "السوق", "souq", "market"] },
  { id: "11", no: 11, ar: "الألعاب والأطفال", en: "Games & Kids", x: 902, y: 652, kind: "station", aliases: ["الالعاب والاطفال", "الالعاب", "العاب", "منطقه الطفل", "منطقه الاطفال", "ركن الطفل", "الاطفال", "lets play", "kids", "games"] },
  { id: "12", no: 12, ar: "قصر الشيخ عبدالله الزاحم", en: "Sheikh Abdullah Al-Zahim Palace", x: 1341, y: 671, kind: "house", aliases: ["قصر الشيخ عبدالله", "قصر الزاحم", "الزاحم"] },
  { id: "13", no: 13, ar: "ديوانية المنيع", en: "Al-Manee' Diwaniya", x: 1173, y: 452, kind: "house", aliases: ["ديوانيه المنيع", "المنيع"] },
  { id: "14", no: 14, ar: "خيمة الأولين", en: "Tent of the Elders", x: 1049, y: 359, kind: "house", aliases: ["خيمه الاولين", "الاولين"] },
  { id: "15", no: 15, ar: "تيه البلور", en: "Crystal Maze", x: 1036, y: 258, kind: "house", aliases: ["تيه البلور", "البلور", "المتاهه", "maze"] },
  { id: "16", no: 16, ar: "مدرسة البنات الأولى", en: "First Girls' School", x: 780, y: 187, kind: "house", aliases: ["مدرسه البنات"] },
  { id: "17", no: 17, ar: "بيت القصب النموذجي", en: "Model Al-Qasab House", x: 587, y: 207, kind: "house", aliases: ["بيت القصب النموذجي", "البيت النموذجي"] },
  { id: "18", no: 18, ar: "دار حميدان الشويعر", en: "House of Humaidan Al-Shuwai'ir", x: 202, y: 321, kind: "house", aliases: ["حميدان", "الشويعر"] },
  { id: "19", no: 19, ar: "مربط الخيول", en: "Horse Stables", x: 51, y: 370, kind: "house", aliases: ["مربط الخيول", "الخيول", "الخيل", "horses"] },
  { id: "20", no: 20, ar: "دار الداغر", en: "Dar Al-Daghir", x: 498, y: 446, kind: "house", aliases: ["الداغر"] },
  { id: "21", no: 21, ar: "منطقة المطاعم", en: "Restaurants Area", x: 268, y: 554, kind: "house", aliases: ["منطقه المطاعم", "المطاعم", "restaurants"] },
  { id: "22", no: 22, ar: "قصر الراشد", en: "Al-Rashid Palace", x: 1017, y: 830, kind: "house", aliases: ["قصر الراشد"] },
  { id: "E", ar: "الدخول", en: "Entrance", x: 1387, y: 826, kind: "service", aliases: ["المدخل", "الدخول", "البوابه", "entrance", "gate"] },
  { id: "X", ar: "الخروج", en: "Exit", x: 1168, y: 813, kind: "service", aliases: ["المخرج", "الخروج", "exit"] },
  { id: "R", ar: "منطقة التسجيل", en: "Registration", x: 1426, y: 758, kind: "service", aliases: ["منطقه التسجيل", "التسجيل", "registration"] },
  { id: "WC1", ar: "دورات المياه (الغرب)", en: "Restrooms (west)", x: 570, y: 325, kind: "service", aliases: [] },
  { id: "WC2", ar: "دورات المياه (قرب المدخل)", en: "Restrooms (near the entrance)", x: 1232, y: 565, kind: "service", aliases: [] },
  { id: "P", ar: "مواقف السيارات", en: "Car park", x: 1144, y: 976, kind: "service", aliases: ["المواقف", "مواقف", "موقف", "parking"] },
  { id: "H", ar: "خيمة الضيافة", en: "Hospitality tent", x: 1515, y: 891, kind: "service", aliases: ["خيمه الضيافه", "الضيافه"] },
  { id: "C1", ar: "قهوة آرت", en: "Art Coffee", x: 434, y: 251, kind: "cafe", aliases: ["قهوه ارت"] },
  { id: "C2", ar: "شاهي ناقع", en: "Shahi Naqi'", x: 773, y: 446, kind: "cafe", aliases: ["شاهي ناقع"] },
  { id: "C3", ar: "قهوة بدور", en: "Budoor Coffee", x: 796, y: 506, kind: "cafe", aliases: ["قهوه بدور"] },
  { id: "C4", ar: "ليفارنو", en: "Livarno", x: 1178, y: 519, kind: "cafe", aliases: ["ليفارنو"] },
  { id: "C5", ar: "فيو", en: "View", x: 1046, y: 718, kind: "cafe", aliases: ["كوفي فيو"] },
];

const WC_ALIASES = ["دوره مياه", "دورات مياه", "دورات المياه", "دوره المياه", "حمام", "الحمام", "الحمامات", "wc", "toilet", "restroom", "bathroom"];

// The visit route (entrance → 1 … 11 → exit) traced on the map, in order.
export const VENUE_ROUTE: [number, number][] = [
  [1300, 805], [1252, 760], [1232, 728], [1180, 690], [1148, 640], [1180, 606], [1241, 611], [1330, 592], [1420, 575],
  [1500, 578], [1575, 560], [1585, 530], [1540, 520], [1460, 520], [1403, 537], [1330, 500], [1284, 449], [1245, 420],
  [1200, 385], [1100, 392], [990, 420], [880, 440], [840, 425], [819, 404], [760, 360], [710, 320], [730, 300], [860, 265],
  [960, 250], [985, 235], [920, 196], [905, 150], [880, 130], [720, 140], [680, 160], [670, 215], [620, 265], [500, 285],
  [420, 298], [300, 318], [270, 335], [300, 380], [359, 407], [390, 470], [420, 515], [520, 515], [602, 495], [750, 490],
  [900, 482], [940, 520], [955, 570], [920, 610], [902, 652], [935, 600], [990, 580], [1040, 640], [1100, 710], [1160, 790],
  [1168, 813],
];

export const venueNode = (id: string) => VENUE_NODES.find((n) => n.id === id);

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const nearestVertex = (p: [number, number]) => {
  let best = 0;
  for (let i = 1; i < VENUE_ROUTE.length; i++) if (dist(p, VENUE_ROUTE[i]) < dist(p, VENUE_ROUTE[best])) best = i;
  return best;
};

/** The node nearest to a point on the map (for a tap: «أنا هنا»). */
export function nearestNode(x: number, y: number, kinds: VenueKind[] = ["station", "house", "service", "cafe"]): VenueNode {
  let best = VENUE_NODES[0];
  for (const n of VENUE_NODES) if (kinds.includes(n.kind) && Math.hypot(n.x - x, n.y - y) < Math.hypot(best.x - x, best.y - y)) best = n;
  return best;
}

export type VenueRoute = { points: [number, number][]; via: VenueNode[] };

/** Walking route between two places on the map: along the visit route (a loop: the exit and the
 *  entrance are side by side at the gate), whichever way round is shorter, with short spurs at both ends. */
export function venueRoute(from: { x: number; y: number }, toId: string): VenueRoute | null {
  let to = venueNode(toId);
  if (!to) return null;
  // «nearest restroom»: pick the one closer to where the visitor is
  if (to.id.startsWith("WC")) {
    const a = venueNode("WC1")!, b = venueNode("WC2")!;
    to = Math.hypot(a.x - from.x, a.y - from.y) < Math.hypot(b.x - from.x, b.y - from.y) ? a : b;
  }
  const N = VENUE_ROUTE.length;
  const ia = nearestVertex([from.x, from.y]);
  const ib = nearestVertex([to.x, to.y]);
  const walk = (step: 1 | -1) => {
    const idx: number[] = [ia];
    for (let i = ia; i !== ib; ) { i = (i + step + N) % N; idx.push(i); }
    let len = 0;
    for (let k = 1; k < idx.length; k++) len += dist(VENUE_ROUTE[idx[k - 1]], VENUE_ROUTE[idx[k]]);
    return { idx, len };
  };
  const fwd = walk(1), back = walk(-1);
  const best = fwd.len <= back.len ? fwd : back;
  const points: [number, number][] = [[from.x, from.y], ...best.idx.map((i) => VENUE_ROUTE[i]), [to.x, to.y]];
  // Numbered places passed on the way, in walking order
  const order = new Map(best.idx.map((v, k) => [v, k]));
  const via = VENUE_NODES.filter((n) => n.no && n.id !== to!.id && Math.hypot(n.x - from.x, n.y - from.y) > 20)
    .map((n) => ({ n, i: nearestVertex([n.x, n.y]) }))
    .filter(({ n, i }) => order.has(i) && i !== ia && i !== ib && Math.hypot(n.x - VENUE_ROUTE[i][0], n.y - VENUE_ROUTE[i][1]) < 45)
    .sort((a, b) => order.get(a.i)! - order.get(b.i)!)
    .map(({ n }) => n);
  return { points, via };
}

// ───────────── phone location → the map ─────────────
// The map is a drawing, so it is tied to real coordinates by six places whose GPS positions are known
// (Al-Zahim palace, Al-Manie' diwaniya, Al-Rashid, Budoor coffee, Art coffee, Shahi Naqi'): a
// least-squares affine fit, about 20–60 map points (10–20 m) off at those places.
const LAT0 = 25.299, LNG0 = 45.506, M_LNG = 100766, M_LAT = 110700;
const FX = [4.804918, 0.920234, 745.87174];
const FY = [1.206443, -1.829083, 504.35824];

/** Where a phone's GPS position falls on the map, and whether it is on (or right by) the season grounds. */
export function gpsToMap(lat: number, lng: number): { x: number; y: number; inside: boolean; metresAway: number } {
  const e = (lng - LNG0) * M_LNG, n = (lat - LAT0) * M_LAT;
  const x = FX[0] * e + FX[1] * n + FX[2];
  const y = FY[0] * e + FY[1] * n + FY[2];
  const inside = x > -60 && x < VENUE_MAP.width + 60 && y > -60 && y < VENUE_MAP.height + 60;
  // distance from the gate, for «you are not at the season yet»
  const metresAway = Math.round(Math.hypot((lng - 45.5072574) * M_LNG, (lat - 25.2983509) * M_LAT));
  return { x, y, inside, metresAway };
}

// ───────────── chat: does a question want the season map? ─────────────
const norm = (s: string) =>
  s.toLowerCase().replace(/[ً-ٰٟـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ");

function findNodes(text: string): VenueNode[] {
  const t = ` ${norm(text)} `;
  const hits: { n: VenueNode; at: number; len: number }[] = [];
  for (const n of VENUE_NODES) {
    for (const a of n.aliases) {
      const i = t.indexOf(norm(a));
      if (i >= 0) { hits.push({ n, at: i, len: a.length }); break; }
    }
  }
  for (const a of WC_ALIASES) {
    const i = t.indexOf(norm(a));
    if (i >= 0) { hits.push({ n: venueNode("WC2")!, at: i, len: a.length }); break; }
  }
  // longest match wins where two overlap («سوق العبيدي» over «السوق»)
  hits.sort((a, b) => b.len - a.len);
  const out: typeof hits = [];
  for (const h of hits) if (!out.some((o) => h.at < o.at + o.len && o.at < h.at + h.len)) out.push(h);
  return out.sort((a, b) => a.at - b.at).map((h) => h.n);
}

const MAP_WORDS = /خريط|خارط|\bmap\b/;
const SEASON_WORDS = /الموسم|موسم|المهرجان|مهرجان|الفعاليه|القريه التراثيه|البلده القديمه|season|festival/;
const WHERE_WORDS = /وين|فين|دلني|دليني|ودني|كيف اروح|كيف اوصل|كيف اجي|طريق|اتجاه|مكان|موقع|اوصل|where|how do i get|how to get|directions|way to/;
const HERE_RE = /(?:انا|احنا|حنا|i am|i'm|we are)\s*(?:الحين\s*)?(?:عند|في|جنب|قدام|داخل|بـ?|at|in|near|by)\s*(.{2,40})/;

/** What the season map should show for a chat question, or null when the map is not wanted. */
export function venueMapIntent(question: string): { to?: string; from?: string } | null {
  const q = norm(question);
  const nodes = findNodes(question);
  const wantsMap = MAP_WORDS.test(q) && (SEASON_WORDS.test(q) || nodes.length > 0 || /المحطات|المسار/.test(q));
  const asksWay = WHERE_WORDS.test(q);
  // «أنا عند الكتاتيب، وين المسرح؟» → from the place after «أنا عند»
  let from: string | undefined;
  const here = HERE_RE.exec(q);
  if (here) from = findNodes(here[1])[0]?.id;
  const targets = nodes.filter((n) => n.id !== from);
  const to = targets[targets.length - 1]?.id;
  const stationNamed = nodes.some((n) => n.kind !== "service" || n.id === "E" || n.id === "X");
  if (wantsMap) return { to, from };
  // Restrooms / parking need the season context (the town has its own); stations are clear on their own
  if (asksWay && to && (stationNamed || SEASON_WORDS.test(q) || from)) return { to, from };
  if (from && to) return { to, from };
  return null;
}

/** Short Arabic description of the map, for the guide's knowledge. */
export function venueMapTextAr(): string {
  const stations = VENUE_NODES.filter((n) => n.kind === "station").map((n) => `${n.no} ${n.ar}`).join("، ");
  const houses = VENUE_NODES.filter((n) => n.kind === "house").map((n) => `${n.no} ${n.ar}`).join("، ");
  const cafes = VENUE_NODES.filter((n) => n.kind === "cafe").map((n) => n.ar).join("، ");
  return (
    "خريطة موسم ملح القصب الرابع الرسمية (١٩–٢٨ نوفمبر، ٤ العصر إلى ١١ الليل، الدخول مجاني): " +
    `ترتيب الزيارة: الدخول ← ${stations} ← الخروج. ` +
    `وبيوت ومعالم على الخريطة: ${houses}. ` +
    `المقاهي: ${cafes}. والخدمات: منطقة التسجيل وخيمة الضيافة عند الدخول، ومواقف السيارات برّا جنب الطريق، ودورتين مياه (وحدة قرب «عن موسم ملح القصب» ووحدة غرب السوق قرب شارع الفن)، ومصليات. ` +
    "الشركاء: ماما نورة، SALT، Jadeel، Joe & The Juice، Let's Play. " +
    "إذا سأل الزائر عن الخريطة أو عن مكان أي محطة، الموقع يعرض له خريطة الموسم تحت جوابك (يقدر يحمّلها PDF)، ويحدد عليها «أنت هنا» والطريق، فقل له يشوفها تحت."
  );
}
