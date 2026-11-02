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
    localStorage.clear();
    sessionStorage.clear();
    if (owner) localStorage.setItem("dahiah:ownerKey", owner);
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

createRoot(document.getElementById('root')!).render(<App />);
