// «جواز الملح»: one stamp per Al-Qasab stop. A visitor gets a stamp by scanning the QR at the
// place (/?stamp=<code>) or with the «أنا هنا» button, which checks the phone's location.
// The QR codes live only on the server (passportCodes.ts) and are checked by /api/passport/stamp,
// so they are not in the page's JavaScript.
import { AL_QASAB_LANDMARKS } from "./alQasabScope.ts";

export interface PassportStop {
  id: string;
  ar: string;
  en: string;
  /** How close (metres) the phone must be for the «أنا هنا» stamp */
  radius: number;
  /** The six core stops earn the «مستكشف القْصَب» certificate; the others are bonus stamps */
  core: boolean;
  lat: number;
  lng: number;
}

const STOPS: Omit<PassportStop, "lat" | "lng" | "core">[] = [
  { id: "festival", ar: "أرض موسم الملح", en: "Salt Season grounds", radius: 400 },
  { id: "salt_flat", ar: "مملحة القصب والجفار", en: "Salt pans (Al-Jifar)", radius: 1000 },
  { id: "sabkha", ar: "صْبَخَة القْصَب", en: "Al-Sabkha", radius: 1500 },
  { id: "heritage_village", ar: "القرية التراثية", en: "Heritage village", radius: 300 },
  { id: "ibn_zahim_palace", ar: "قصر ابن زاحم", en: "Ibn Zahim palace", radius: 200 },
  { id: "al_marqab", ar: "مرقب القصب", en: "The watchtower", radius: 350 },
];

// Bonus stamps: more of Al-Qasab and its surroundings (coordinates from the official city guide
// and Google Maps). Nature spots far out of town get a wide radius.
const EXTRA_STOPS: Omit<PassportStop, "core">[] = [
  { id: "burdan_lake", ar: "الواحة الخضراء (بحيرة برودان)", en: "The Green Oasis (Burdan lake)", radius: 1200, lat: 25.189667, lng: 45.62025 },
  { id: "muqhim_pan", ar: "مَمْلَحَة المقحم النموذجية", en: "Al-Muqhim model salt pan", radius: 600, lat: 25.260929, lng: 45.548462 },
  { id: "obaidi_souq", ar: "سوق العبيدي", en: "Souq Al-Obaidi", radius: 150, lat: 25.2991872, lng: 45.5063997 },
  { id: "rashid_house", ar: "منزل الراشد التراثي", en: "Al-Rashid heritage house", radius: 150, lat: 25.2978335, lng: 45.5067437 },
  { id: "art_club", ar: "النادي التشكيلي (السريالي)", en: "The art club (Surrealist)", radius: 150, lat: 25.2989471, lng: 45.5053567 },
  { id: "king_salman_park", ar: "حديقة الملك سلمان", en: "King Salman Park", radius: 450, lat: 25.3037518, lng: 45.5331749 },
  { id: "akrashiya", ar: "روضة العكرشية", en: "Rawdat Al-Akrashiya", radius: 1500, lat: 25.3407898, lng: 45.3647892 },
  { id: "birds_museum", ar: "متحف ومحمية طيور الوشم", en: "Al-Washm bird museum", radius: 450, lat: 25.2546554, lng: 45.4738085 },
  { id: "nafud", ar: "نفود القْصَب وجبل الفهدة", en: "The Nafud dunes & Jabal Al-Fahda", radius: 3000, lat: 25.191118, lng: 45.520565 },
  { id: "shafei_park", ar: "منتزه الشفيعي", en: "Al-Shafei park", radius: 1500, lat: 25.4049078, lng: 45.5720615 },
];

export const CORE_STOPS: PassportStop[] = STOPS.map((s) => {
  const lm = AL_QASAB_LANDMARKS.find((l) => l.id === s.id)!;
  return { ...s, core: true, lat: lm.coordinates.lat, lng: lm.coordinates.lng };
});
export const BONUS_STOPS: PassportStop[] = EXTRA_STOPS.map((s) => ({ ...s, core: false }));
export const PASSPORT_STOPS: PassportStop[] = [...CORE_STOPS, ...BONUS_STOPS];

/** Distance in metres between two points. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Can the visitor stamp this stop from where they are? (GPS accuracy gives some slack, up to 150 m) */
export function isNearStop(stop: PassportStop, pos: { lat: number; lng: number; accuracy?: number }) {
  const d = distanceMeters(stop, pos);
  return { ok: d <= stop.radius + Math.min(pos.accuracy || 0, 150), distance: d };
}
