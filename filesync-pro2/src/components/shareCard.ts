// Draws the «زرت القصب» / «مستكشف القصب» card (1080×1350, Instagram/WhatsApp friendly)
// from the visitor's salt-passport stamps, and shares or downloads it.
import { PASSPORT_STOPS } from "../../server/saltPassport.ts";

const W = 1080;
const H = 1350;
// «ملح القصب» brand identity palette
const BRAND = "#B2512F";
const DARK = "#8f3c22";
const SOFT = "#D18372";
const INK = "#321210";
const MUTED = "#8a6a67";

const digits = (n: number, en: boolean) => (en ? String(n) : n.toLocaleString("ar-SA"));

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrinks the font until the text fits the width. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, size: number) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px Alexandria, "Noto Naskh Arabic", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    s -= 2;
  } while (s > 18);
}

export async function drawShareCard(opts: { stamps: Record<string, number>; name: string; lang: "ar" | "en" }): Promise<Blob> {
  const en = opts.lang === "en";
  try {
    await Promise.all([
      document.fonts?.load('800 72px Alexandria'),
      document.fonts?.load('600 34px Alexandria'),
    ]);
  } catch {
    /* system font is fine */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.direction = en ? "ltr" : "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const done = PASSPORT_STOPS.filter((s) => opts.stamps[s.id]);
  const complete = done.length === PASSPORT_STOPS.length;

  // Background + red header
  ctx.fillStyle = "#F1E7E7";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 460);
  grad.addColorStop(0, DARK);
  grad.addColorStop(1, SOFT);
  ctx.fillStyle = grad;
  roundRect(ctx, 0, -60, W, 520, 60);
  ctx.fill();

  // Contour pattern from the brand identity, faint over the header
  const pattern = await loadImage("/images/salt-season-pattern.jpg");
  if (pattern) {
    ctx.save();
    roundRect(ctx, 0, -60, W, 520, 60);
    ctx.clip();
    ctx.globalAlpha = 0.16;
    ctx.drawImage(pattern, 0, -60, W, (W * pattern.height) / pattern.width);
    ctx.restore();
  }

  // Logo
  const logo = await loadImage("/images/logo.png");
  ctx.fillStyle = "#fff";
  roundRect(ctx, W / 2 - 80, 50, 160, 160, 36);
  ctx.fill();
  if (logo) {
    ctx.save();
    roundRect(ctx, W / 2 - 72, 58, 144, 144, 30);
    ctx.clip();
    ctx.drawImage(logo, W / 2 - 72, 58, 144, 144);
    ctx.restore();
  }

  // Title
  ctx.fillStyle = "#fff";
  const title = complete ? (en ? "Al-Qasab Explorer" : "مستكشف القَصَب") : en ? "I visited Al-Qasab" : "زرت القَصَب";
  fitText(ctx, title, W - 120, 800, 84);
  ctx.fillText(title, W / 2, 290);
  ctx.font = '600 34px Alexandria, sans-serif';
  ctx.fillStyle = "#F1E7E7";
  ctx.fillText(en ? "Al-Qasab Salt Season · Salt Passport" : "موسم ملح القَصَب · جواز الملح", W / 2, 375);

  // Name / certificate line
  const y = 530;
  const name = opts.name.trim().slice(0, 40);
  ctx.fillStyle = INK;
  if (complete) {
    const line1 = name ? (en ? `«Al-Dahiya» certifies that ${name}` : `يشهد «الداهية» أن ${name}`) : en ? "«Al-Dahiya» certifies that you" : "يشهد «الداهية» إنك";
    fitText(ctx, line1, W - 140, 700, 46);
    ctx.fillText(line1, W / 2, y);
    ctx.font = '600 32px Alexandria, sans-serif';
    ctx.fillStyle = MUTED;
    ctx.fillText(en ? "visited all six landmarks of Al-Qasab" : "زار معالم القَصَب الست كلها", W / 2, y + 56);
  } else if (name) {
    fitText(ctx, name, W - 140, 700, 48);
    ctx.fillText(name, W / 2, y + 20);
  }

  // Stamps: 2 columns × 3 rows (fixed area so nothing overlaps)
  const top = 625;
  const cellW = 470;
  const cellH = 205;
  const R = 56;
  PASSPORT_STOPS.forEach((stop, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    // RTL: first stamp on the right
    const cx = en ? 70 + col * cellW + cellW / 2 : W - 70 - col * cellW - cellW / 2;
    const cy = top + row * cellH + 60;
    const stamped = !!opts.stamps[stop.id];

    ctx.save();
    ctx.lineWidth = 8;
    if (stamped) {
      ctx.fillStyle = "rgba(178,81,47,0.10)";
      ctx.strokeStyle = BRAND;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // tick
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 23, cy + 2);
      ctx.lineTo(cx - 5, cy + 20);
      ctx.lineTo(cx + 25, cy - 16);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#EAD0CB";
      ctx.setLineDash([14, 12]);
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = stamped ? INK : "#b9a19e";
    fitText(ctx, en ? stop.en : stop.ar, cellW - 40, 700, 32);
    ctx.fillText(en ? stop.en : stop.ar, cx, cy + 90);
  });

  // Progress + footer
  ctx.fillStyle = BRAND;
  ctx.font = '700 36px Alexandria, sans-serif';
  const progress = en
    ? `${done.length} of ${PASSPORT_STOPS.length} stamps`
    : `${digits(done.length, false)} من ${digits(PASSPORT_STOPS.length, false)} أختام`;
  ctx.fillText(progress, W / 2, H - 112);
  // Official season logo in the corner
  const seasonLogo = await loadImage("/images/salt-season-logo.png");
  if (seasonLogo) {
    const lh = 110;
    const lw = (lh * seasonLogo.width) / seasonLogo.height;
    ctx.drawImage(seasonLogo, en ? W - 60 - lw : 60, H - 150, lw, lh);
  }
  ctx.fillStyle = MUTED;
  ctx.font = '600 28px Alexandria, sans-serif';
  ctx.fillText(en ? "Ask «Al-Dahiya» · al-dahiah.onrender.com" : "اسأل «الداهية» · al-dahiah.onrender.com", W / 2, H - 56);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

/** Native share sheet when the phone supports sharing files, otherwise a download. */
export async function shareOrDownload(blob: Blob, lang: "ar" | "en"): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], "al-qasab-salt-passport.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: lang === "en" ? "Al-Qasab Salt Passport" : "جواز الملح - القصب",
        text: lang === "en" ? "My Al-Qasab Salt Season tour with «Al-Dahiya»" : "جولتي في موسم ملح القصب مع «الداهية»",
      });
      return "shared";
    } catch (e: any) {
      if (e?.name === "AbortError") return "cancelled";
      /* fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}
