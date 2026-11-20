import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// One-time fresh start for every visitor, new or returning: when this number changes, everything
// the site kept on the device (welcome seen, saved voice, day/night pick, salt passport) is wiped,
// so the grandfather welcomes everyone once again. Bump it to reset again in a later update.
const RESET_VERSION = "2026-10-31-welcome";
try {
  if (localStorage.getItem("dahiah:reset") !== RESET_VERSION) {
    const owner = localStorage.getItem("dahiah:ownerKey");
    const vid = localStorage.getItem("dahiah:vid");
    localStorage.clear();
    sessionStorage.clear();
    if (owner) localStorage.setItem("dahiah:ownerKey", owner);
    if (vid) localStorage.setItem("dahiah:vid", vid); // the visit counter's random id survives a reset
    localStorage.setItem("dahiah:reset", RESET_VERSION);
  }
} catch {}

// Owner «teach» mode: open the site once with ?teach=<owner key>; the key stays on this device only
// and lets the owner teach «الداهية» pronunciations in the chat and the call.
try {
  const u = new URL(location.href);
  const k = u.searchParams.get("teach");
  if (k) {
    if (k === "off") localStorage.removeItem("dahiah:ownerKey");
    else localStorage.setItem("dahiah:ownerKey", k);
    u.searchParams.delete("teach");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }
} catch {}

// Visit counter for the owner's /visitors page: one small beacon per page load with a random id kept
// on this device (no name, no IP stored). The owner's own device (it holds his code) is not counted.
try {
  if (!localStorage.getItem("dahiah:ownerKey")) {
    let vid = localStorage.getItem("dahiah:vid");
    if (!vid) {
      vid = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, "0")).join("");
      localStorage.setItem("dahiah:vid", vid);
    }
    const src = new URLSearchParams(location.search).get("src") || "";
    const body = JSON.stringify({ vid, ref: document.referrer, src, lang: navigator.language, path: location.pathname });
    const send = (b: string) => {
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/visit", new Blob([b], { type: "application/json" })))) {
        fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: b, keepalive: true }).catch(() => {});
      }
    };
    send(body);
    // «الحين في الموقع»: a tiny heartbeat each minute while the page is open and on screen
    const beat = () => { if (document.visibilityState === "visible") send(JSON.stringify({ vid, hb: true })); };
    setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
  }
} catch {}

createRoot(document.getElementById('root')!).render(<App />);
