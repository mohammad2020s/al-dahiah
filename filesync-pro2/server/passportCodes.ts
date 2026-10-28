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
};

export const stopForCode = (code: string) => {
  const c = String(code || "").trim().toLowerCase();
  const id = Object.keys(CODES).find((k) => CODES[k] === c);
  return id ? PASSPORT_STOPS.find((s) => s.id === id) || null : null;
};

export const stopsWithCodes = () => PASSPORT_STOPS.map((s) => ({ id: s.id, ar: s.ar, en: s.en, code: CODES[s.id] }));
