// Server-only: the code printed in each «جواز الملح» QR sign (/?stamp=<code>).
// Short and hard to guess so a stamp means "I was there". Change one to retire a printed sign.
import { PASSPORT_STOPS } from "./saltPassport.ts";

const CODES: Record<string, string> = {
  festival: "msm-3k9q",
  salt_flat: "jfr-4q7w",
  sabkha: "sbk-8m2x",
  heritage_village: "qry-6t1z",
  ibn_zahim_palace: "zhm-2w5r",
  al_marqab: "mrq-9p4v",
  burdan_lake: "brd-5h8k",
  muqhim_pan: "mqh-7c3n",
  obaidi_souq: "obd-2r6j",
  rashid_house: "rsd-8v1m",
  art_club: "art-4x9d",
  king_salman_park: "kslm-6b2q",
  akrashiya: "akr-3n7t",
  birds_museum: "tyr-9k4f",
  nafud: "nfd-1z8w",
  shafei_park: "shf-5m3p",
};

export const stopForCode = (code: string) => {
  const c = String(code || "").trim().toLowerCase();
  const id = Object.keys(CODES).find((k) => CODES[k] === c);
  return id ? PASSPORT_STOPS.find((s) => s.id === id) || null : null;
};

export const stopsWithCodes = () => PASSPORT_STOPS.map((s) => ({ id: s.id, ar: s.ar, en: s.en, code: CODES[s.id] }));
