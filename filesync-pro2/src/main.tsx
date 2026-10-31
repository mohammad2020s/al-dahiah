import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// One-time fresh start for every visitor, new or returning: when this number changes, everything
// the site kept on the device (welcome seen, saved voice, day/night pick, salt passport) is wiped,
// so the grandfather welcomes everyone once again. Bump it to reset again in a later update.
const RESET_VERSION = "2026-10-31-welcome";
try {
  if (localStorage.getItem("dahiah:reset") !== RESET_VERSION) {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("dahiah:reset", RESET_VERSION);
  }
} catch {}

createRoot(document.getElementById('root')!).render(<App />);
