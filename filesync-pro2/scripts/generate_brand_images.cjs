const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const chunkType = Buffer.from(type);
  const body = Buffer.concat([chunkType, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, body, crcBuf]);
}

function createPng(width, height, drawFn) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", deflated);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Generate Logo (Terracotta + Salt Mound & Sparkles)
const logoBuffer = createPng(256, 256, (x, y, w, h) => {
  const dx = x - 128;
  const dy = y - 128;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Circular badge
  if (dist > 124) return [0, 0, 0, 0];

  // Terracotta base gradient
  const grad = y / h;
  let r = Math.round(168 - grad * 35);
  let g = Math.round(67 - grad * 25);
  let b = Math.round(42 - grad * 15);
  let a = 255;

  // Outer dashed ring effect
  if (dist > 115 && dist < 119) {
    const angle = Math.atan2(dy, dx);
    if (Math.sin(angle * 12) > 0) {
      return [254, 205, 211, 220];
    }
  }

  // Salt mound silhouette (triangle/bell curve from center-bottom)
  const bellX = (x - 128) / 75;
  const peakY = 80 + Math.exp(-bellX * bellX * 2.2) * 110;
  if (y >= 210 - peakY && y <= 210) {
    const innerDist = Math.abs(x - 128);
    if (innerDist < 35 && y > 120 && y < 200) {
      // White snow-white salt core
      return [255, 255, 255, 255];
    }
    // Soft pearlescent salt mound
    return [254, 242, 242, 240];
  }

  // Sparkling star at peak (128, 65)
  const starDistX = Math.abs(x - 128);
  const starDistY = Math.abs(y - 68);
  if ((starDistX < 3 && starDistY < 18) || (starDistY < 3 && starDistX < 18)) {
    return [255, 255, 255, 255];
  }
  if (starDistX + starDistY < 12) {
    return [255, 255, 255, 240];
  }

  // Small sparkles
  const s1x = Math.abs(x - 75);
  const s1y = Math.abs(y - 110);
  if (s1x + s1y < 8) return [254, 215, 170, 230];

  const s2x = Math.abs(x - 181);
  const s2y = Math.abs(y - 110);
  if (s2x + s2y < 8) return [254, 215, 170, 230];

  return [r, g, b, a];
});

// 2. Generate Tanmiah Emblem (Flame / Seedling Teardrop)
const tanmiahBuffer = createPng(256, 256, (x, y, w, h) => {
  // Center is (128, 140)
  const nx = (x - 128) / 100;
  const ny = (y - 30) / 190; // 0 at top, 1 at bottom

  if (ny < 0 || ny > 1) return [0, 0, 0, 0];

  // Teardrop / Flame boundary
  const widthAtY = Math.sin(ny * Math.PI) * Math.pow(ny, 0.45) * 1.15;
  const distFromCenter = Math.abs(nx);

  if (distFromCenter > widthAtY) return [0, 0, 0, 0];

  // Left side: Forest Green (#1b4d3e)
  // Right side: Burgundy (#801b13)
  // Center curve: Golden Seedling
  if (distFromCenter < 0.22 && ny > 0.35 && ny < 0.85) {
    const seedDist = Math.sin((ny - 0.35) / 0.5 * Math.PI) * 0.22;
    if (distFromCenter < seedDist) {
      return [250, 204, 21, 255]; // Gold
    }
  }

  if (nx < 0) {
    return [27, 77, 62, 255]; // Deep Forest Green #1b4d3e
  } else {
    return [128, 27, 19, 255]; // Deep Burgundy #801b13
  }
});

// Save to both /images and /public/images with all naming variants
const targetDirs = [
  path.resolve(process.cwd(), "images"),
  path.resolve(process.cwd(), "public/images")
];

for (const dir of targetDirs) {
  fs.mkdirSync(dir, { recursive: true });

  // Logo files
  fs.writeFileSync(path.join(dir, "logo.png"), logoBuffer);
  fs.writeFileSync(path.join(dir, "logo.jfif"), logoBuffer);
  fs.writeFileSync(path.join(dir, "logo.jpg"), logoBuffer);
  fs.writeFileSync(path.join(dir, "Aldahiah-logo.jfif"), logoBuffer);

  // Tanmiah files
  fs.writeFileSync(path.join(dir, "tanmiah.png"), tanmiahBuffer);
  fs.writeFileSync(path.join(dir, "tanmiah.jfif"), tanmiahBuffer);
  fs.writeFileSync(path.join(dir, "tanmiah.jpg"), tanmiahBuffer);
  fs.writeFileSync(path.join(dir, "al-tanmiah.png"), tanmiahBuffer);
}

console.log("Successfully generated all brand image assets in images/ and public/images/");
