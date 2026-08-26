/**
 * Generates the PWA icon set.
 *
 * Drawn rather than shipped as binaries: the mark is the Frame & Signal
 * record light — a vermilion dot on the ink canvas — so it is a handful of
 * SVG primitives, and generating it means the icons cannot drift from the
 * palette the rest of the product uses.
 *
 * PNG is written by hand (no sharp dependency) because these are flat colour
 * with a circle: a tiny zlib-compressed RGBA bitmap is far less machinery
 * than an image pipeline for four files.
 *
 *   node scripts/icons.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const INK = [8, 8, 12];        // --ink-1000, the canvas
const SIGNAL = [240, 78, 46];  // --signal-500, the record light

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A rounded-square icon with a centred dot, as raw RGBA. */
function render(size, { maskable }) {
  // Maskable icons are cropped to a safe circle by the platform, so the mark
  // shrinks and the background runs edge to edge.
  const radius = maskable ? 0 : size * 0.22;
  const dot = size * (maskable ? 0.17 : 0.22);
  const cx = size / 2;
  const cy = size / 2;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4 + 1);
    row[0] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 4;

      // Outside the rounded square → transparent.
      const inside = insideRounded(x, y, size, radius);
      if (!inside) {
        row[i] = row[i + 1] = row[i + 2] = row[i + 3] = 0;
        continue;
      }

      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // One pixel of feather so the dot does not look chewed at 48px.
      const t = Math.min(1, Math.max(0, dot - d + 0.5));
      const colour = [
        Math.round(INK[0] + (SIGNAL[0] - INK[0]) * t),
        Math.round(INK[1] + (SIGNAL[1] - INK[1]) * t),
        Math.round(INK[2] + (SIGNAL[2] - INK[2]) * t),
      ];
      row[i] = colour[0];
      row[i + 1] = colour[1];
      row[i + 2] = colour[2];
      row[i + 3] = 255;
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function insideRounded(x, y, size, r) {
  if (r <= 0) return true;
  const nx = Math.min(x, size - 1 - x);
  const ny = Math.min(y, size - 1 - y);
  if (nx >= r || ny >= r) return true;
  return Math.hypot(r - nx, r - ny) <= r;
}

mkdirSync("public/icons", { recursive: true });

const targets = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-192.png", size: 192, maskable: true },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: true },
];

for (const t of targets) {
  writeFileSync(`public/icons/${t.name}`, render(t.size, t));
  console.log(`  ${t.name}  ${t.size}×${t.size}`);
}

// The favicon is the same mark as SVG, so it stays crisp at any size.
writeFileSync(
  "public/icons/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="113" fill="#08080c"/>
  <circle cx="256" cy="256" r="112" fill="#f04e2e"/>
</svg>
`,
);
console.log("  icon.svg");
