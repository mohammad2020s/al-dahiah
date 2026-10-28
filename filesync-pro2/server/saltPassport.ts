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
  lat: number;
  lng: number;
}

const STOPS: Omit<PassportStop, "lat" | "lng">[] = [
  { id: "festival", ar: "أرض موسم الملح", en: "Salt Season grounds", radius: 400 },
  { id: "salt_flat", ar: "مملحة القصب والجفار", en: "Salt pans (Al-Jifar)", radius: 1000 },
  { id: "sabkha", ar: "صْبَخَة القَصَب", en: "Al-Sabkha", radius: 1500 },
  { id: "heritage_village", ar: "القرية التراثية", en: "Heritage village", radius: 300 },
  { id: "ibn_zahim_palace", ar: "قصر ابن زاحم", en: "Ibn Zahim palace", radius: 200 },
  { id: "al_marqab", ar: "مرقب القصب", en: "The watchtower", radius: 350 },
];

export const PASSPORT_STOPS: PassportStop[] = STOPS.map((s) => {
  const lm = AL_QASAB_LANDMARKS.find((l) => l.id === s.id)!;
  return { ...s, lat: lm.coordinates.lat, lng: lm.coordinates.lng };
});

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
