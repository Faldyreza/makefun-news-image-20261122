// main.ts — news-image-20261122 v1 "THE WORLD — SUNDAY, 22 NOVEMBER 2026"
// A program that draws one newspaper front page summing up the world's news of
// Sunday 22 November 2026 and writes it to /output/entry.png (1024x1024 PNG,
// <= 1 MiB) plus /output/dossier.json. Node 22 stdlib only, no network at run
// time, fully deterministic: two runs produce byte-identical files.
//
// FACTS (verified live from reputable sources on 22 Nov 2026; see dossier.json
// for the source of every fact — no invented numbers, quotes or casualties):
//  LEAD — COP31, Antalya: talks in a second day of overtime, set to end with
//    no deal; summit president Murat Kurum: no new draft; draft dropped
//    fossil-fuel wording and a proposed $120bn adaptation-finance target;
//    EU climate chief Wopke Hoekstra: "good deal or no deal". (Reuters, 22 Nov)
//  BAHRAIN: Iran's IRGC claims missile-and-drone strikes on US positions at
//    Al-Riffa and Awali bases, saying it hit two Patriot radars; Bahrain says
//    a civilian industrial facility was hit (fire, no injuries) and its air
//    defences intercepted other attacks. (Al Jazeera / Reuters, 21-22 Nov)
//  CIKANDE, INDONESIA: fire at the PT Fonusa Agung Mulia candy factory broke
//    out Saturday 17:00; 3 dead, 36 missing, 15 rescued alive (4 injured);
//    search still under way on Sunday. (AP / Reuters, 22 Nov)
//  KRYVYI RIH, UKRAINE: Russian missiles hit Zelenskyy's hometown Friday
//    night; a 7-year-old boy and a 20-year-old woman paramedic killed,
//    60 wounded incl. 6 children; follow-up strikes hit rescuers.
//    (AP, 21 Nov; also: Russian cargo ship Sparta II on fire in the Gulf of
//    Finland after a suspected Ukrainian drone strike, 21 Nov)
//  IN BRIEF — Mexico: cartel boss Fausto Isidro Meza Flores ("El Chapo
//    Isidro", FBI 10 Most Wanted) captured in Guasave, Sinaloa; 11 killed
//    (4 soldiers, 7 gunmen). (AP, 21 Nov) / EU and Indonesia signed a trade
//    and investment deal in Brussels after nearly 10 years of talks; tariffs
//    on up to 98.5% of lines to go. (21 Nov) / US stocks fell into correction
//    Friday in an AI sell-off: S&P 500 -3.7%, Nasdaq -5.3%. (AP, 20 Nov) /
//    Nigeria: boat carrying mourners to a funeral capsized in Bayelsa; death
//    toll 24. (Reuters, 22 Nov) / Nepal PM Balendra Shah arrived in India
//    for a two-day visit. (22 Nov) / Cricket: India declared 720/9, leading
//    New Zealand by 352 runs in the Wellington Test. (22 Nov)

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const buf = Buffer.alloc(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [245, 239, 224];
const INK: RGB = [25, 23, 19];
const RED: RGB = [158, 27, 27];
const TEAL: RGB = [46, 111, 115];
const TEAL_PALE: RGB = [213, 229, 225];
const OCHRE: RGB = [198, 160, 74];
const GREY: RGB = [107, 101, 90];
const SMOKE: RGB = [150, 146, 136];
const SMOKE_DARK: RGB = [110, 106, 96];
const ORANGE: RGB = [214, 106, 32];
const SKY: RGB = [223, 232, 234];
const DARK: RGB = [43, 52, 54];
const WHITE: RGB = [250, 248, 242];

function px(x: number, y: number, c: RGB): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const a = Math.max(0, Math.floor(x0));
  const b = Math.max(0, Math.floor(y0));
  const d = Math.min(W, Math.ceil(x1));
  const e = Math.min(H, Math.ceil(y1));
  for (let y = b; y < e; y++) {
    for (let x = a; x < d; x++) {
      const i = (y * W + x) * 3;
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
    }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  const rr = Math.max(0.5, r);
  const x0 = Math.floor(cx - rr);
  const x1 = Math.ceil(cx + rr);
  const y0 = Math.floor(cy - rr);
  const y1 = Math.ceil(cy + rr);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rr * rr) px(x, y, c);
    }
  }
}

function thickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const r = Math.max(0.75, w / 2);
  if (len < 0.001) {
    disc(x0, y0, r, c);
    return;
  }
  const steps = Math.max(1, Math.ceil(len / Math.max(0.6, r * 0.8)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, c);
  }
}

type Pt = [number, number];

function polyline(pts: Pt[], w: number, c: RGB): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    thickLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, c);
  }
}

// Scanline fill for a simple (non self-intersecting) polygon.
function fillPolygon(pts: Pt[], c: RGB): void {
  let minY = H;
  let maxY = -1;
  for (const p of pts) {
    minY = Math.min(minY, Math.floor(p[1]));
    maxY = Math.max(maxY, Math.ceil(p[1]));
  }
  minY = Math.max(0, minY);
  maxY = Math.min(H - 1, maxY);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y + 0.5 - a[1]) / (b[1] - a[1]);
        xs.push(a[0] + (b[0] - a[0]) * t);
      }
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i]));
      const x1 = Math.min(W - 1, Math.floor(xs[i + 1]));
      for (let x = x0; x <= x1; x++) px(x, y, c);
    }
  }
}

function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  const x0 = Math.floor(cx - rx);
  const x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry);
  const y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(x, y, c);
    }
  }
}

// Points along an ellipse arc (angles in radians).
function arcPoints(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

// ---------------------------------------------------------------- stroke font
// Hand-drawn single-stroke capitals on a 10 x 14 grid (y down, cap top = 0).
// Format per glyph: strokes separated by "|", points "x,y" separated by spaces.
const FONT: Record<string, string> = {
  A: "0,14 5,0 10,14|2.8,8.5 7.2,8.5",
  B: "0,0 0,14|0,0 6.5,0 9.5,3 6.5,6.5 0,6.5|0,6.5 6.5,6.5 9.5,10.5 6.5,14 0,14",
  C: "9,2 6,0 2,0 0,3 0,11 2,14 6,14 9,12",
  D: "0,0 0,14|0,0 6,0 10,4 10,10 6,14 0,14",
  E: "0,0 0,14|0,0 8,0|0,7 6,7|0,14 8,14",
  F: "0,0 0,14|0,0 8,0|0,7 6,7",
  G: "9,2 6,0 2,0 0,3 0,11 2,14 6,14 9,12 9,8 5.5,8",
  H: "0,0 0,14|10,0 10,14|0,7 10,7",
  I: "5,0 5,14|2,0 8,0|2,14 8,14",
  J: "3,0 8,0|8,0 8,11 5,14 2,14 0,11",
  K: "0,0 0,14|9,0 0,7 9,14",
  L: "0,0 0,14|0,14 9,14",
  M: "0,14 0,0 5,9 10,0 10,14",
  N: "0,14 0,0 10,14 10,0",
  O: "5,0 2,0 0,3 0,11 2,14 5,14 8,14 10,11 10,3 8,0 5,0",
  P: "0,0 0,14|0,0 7,0 10,3 7,7 0,7",
  Q: "5,0 2,0 0,3 0,11 2,14 5,14 8,14 10,11 10,3 8,0 5,0|6,9 10,14",
  R: "0,0 0,14|0,0 7,0 10,3 7,7 0,7|4.5,7 10,14",
  S: "9,1 6,0 2,0 0,2 0,5 2,7 5,7 8,7 10,9 10,12 8,14 4,14 1,13",
  T: "0,0 10,0|5,0 5,14",
  U: "0,0 0,11 2,14 5,14 8,14 10,11 10,0",
  V: "0,0 5,14 10,0",
  W: "0,0 2.5,14 5,5 7.5,14 10,0",
  X: "0,0 10,14|10,0 0,14",
  Y: "0,0 5,7 10,0|5,7 5,14",
  Z: "0,0 10,0 0,14 10,14",
  "0": "5,0 2,0 0,3 0,11 2,14 5,14 8,14 10,11 10,3 8,0 5,0",
  "1": "3,2 5,0 5,14|2,14 8,14",
  "2": "1,3 3,0 7,0 9,3 9,6 0,14 10,14",
  "3": "1,1 4,0 7,0 10,3 7,7 4,7|7,7 10,10 7,14 4,14 1,13",
  "4": "8,0 0,10 8,10|8,0 8,14",
  "5": "9,0 0,0 0,6 7,6 10,9 10,12 7,14 1,14",
  "6": "9,1 5,0 1,2 0,6 0,11 2,14 6,14 9,11 9,8 6,6 2,6 0,8",
  "7": "0,0 10,0 5,14",
  "8": "3,0 7,0 10,3 7,7 3,7 0,3 3,0|3,7 7,7 10,11 7,14 3,14 0,11 3,7",
  "9": "1,13 5,14 9,12 10,8 10,3 8,0 4,0 1,3 1,6 4,8 8,8 10,6",
  ".": "5,12.5 5,12.5",
  ",": "5,12 4,14.5",
  ":": "5,5 5,5|5,12.5 5,12.5",
  ";": "5,5 5,5|5,12 4,14.5",
  "!": "5,0 5,9|5,12.5 5,12.5",
  "?": "2,1 4,0 7,0 9,2 9,4 7,6 5,7 5,9|5,12.5 5,12.5",
  "'": "5,0 4,4",
  "\u2019": "5,0 4,4",
  '"': "3,0 2.5,4|7,0 6.5,4",
  "(": "7,0 4,3 4,11 7,14",
  ")": "3,0 6,3 6,11 3,14",
  "-": "1,7 9,7",
  "\u2013": "1,7 9,7",
  "\u2014": "0,7 10,7",
  "/": "8,0 2,14",
  "%": "1,1 3,0 5,1 5,3 3,4 1,3 1,1|5,10 7,9 9,10 9,12 7,13 5,12 5,10|9,0 1,14",
  "+": "5,3 5,11|1,7 9,7",
  "=": "1,5 9,5|1,9 9,9",
  $: "5,-1 5,15|9,1 6,0 2,0 0,2 0,5 2,7 5,7 8,7 10,9 10,12 8,14 4,14 1,13",
  "&": "8,2 5,0 2,1 1,4 3,7 6,7 9,10 9,13 6,14 3,14 1,12|3,7 9,0",
  "\u00b7": "5,6 5,6",
  " ": "",
};
const ADVANCE = 11.5; // grid units per character (incl. gap)

function parseGlyph(g: string): Pt[][] {
  if (!g) return [];
  return g.split("|").map((stroke) =>
    stroke
      .trim()
      .split(/\s+/)
      .map((tok) => {
        const [x, y] = tok.split(",").map(Number);
        return [x, y] as Pt;
      }),
  );
}

const GLYPHS: Record<string, Pt[][]> = {};
for (const k of Object.keys(FONT)) GLYPHS[k] = parseGlyph(FONT[k]);

function measure(text: string, scale: number): number {
  let w = 0;
  for (const ch of text) {
    void ch;
    w += ADVANCE * scale;
  }
  return w - scale * 1.5; // no trailing gap
}

function drawText(text: string, x: number, yTop: number, scale: number, c: RGB, align: "left" | "center" | "right" = "left"): void {
  const w = measure(text, scale);
  let cx = x;
  if (align === "center") cx = x - w / 2;
  if (align === "right") cx = x - w;
  const strokeW = Math.max(1.5, scale * 1.3);
  for (const ch of text) {
    const glyph = GLYPHS[ch.toUpperCase()];
    if (glyph) {
      for (const stroke of glyph) {
        const pts: Pt[] = stroke.map(([gx, gy]) => [cx + gx * scale, yTop + gy * scale]);
        if (pts.length === 1) disc(pts[0][0], pts[0][1], strokeW / 2, c);
        else polyline(pts, strokeW, c);
      }
    }
    cx += ADVANCE * scale;
  }
}

// Shrink the scale until the text fits maxWidth (never below floor).
function fitScale(text: string, maxWidth: number, start: number, floor = 0.9): number {
  let s = start;
  while (s > floor && measure(text, s) > maxWidth) s -= 0.05;
  return s;
}

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- dossier
const DOSSIER = {
  date: "2026-11-22",
  title: "THE WORLD — SUNDAY, 22 NOVEMBER 2026",
  edition: "v1",
  stories: [
    {
      slot: "lead",
      kicker: "CLIMATE — ANTALYA, TURKEY",
      headline: "COP31 TALKS SET FOR NO DEAL",
      facts: [
        "Antalya summit in a second day of overtime on Sunday 22 Nov 2026.",
        "Summit president Murat Kurum: no new draft of the deal.",
        "Draft dropped fossil-fuel wording and a proposed $120bn adaptation-finance target.",
        "EU climate chief Wopke Hoekstra: 'good deal or no deal'.",
      ],
      sources: ["Reuters, 22 Nov 2026 — COP31 climate talks set to collapse without political deal", "Reuters, 22 Nov 2026 — COP31 climate deal in the balance after fractious talks"],
    },
    {
      slot: "secondary-1",
      kicker: "BAHRAIN",
      headline: "IRAN STRIKES US BASES",
      facts: [
        "Iran's IRGC claims missile-and-drone strikes on US positions at Al-Riffa and Awali bases, saying it hit two Patriot radars.",
        "Bahrain says a civilian industrial facility was hit (fire, no injuries) and air defences intercepted other attacks.",
      ],
      sources: ["Al Jazeera via ANI, 22 Nov 2026", "Reuters, 21 Nov 2026", "Bahrain Ministry of Interior, 21 Nov 2026"],
    },
    {
      slot: "secondary-2",
      kicker: "CIKANDE, INDONESIA",
      headline: "FACTORY FIRE IN CIKANDE",
      facts: [
        "Fire broke out Saturday 17:00 local at the PT Fonusa Agung Mulia candy factory.",
        "3 dead, 36 missing; 15 rescued alive, 4 injured; search under way on Sunday.",
      ],
      sources: ["Associated Press, 22 Nov 2026", "Reuters, 22 Nov 2026"],
    },
    {
      slot: "secondary-3",
      kicker: "KRYVYI RIH, UKRAINE",
      headline: "MISSILES HIT ZELENSKYY'S HOMETOWN",
      facts: [
        "Russian missiles hit Kryvyi Rih on Friday night; follow-up strikes hit rescuers.",
        "A 7-year-old boy and a 20-year-old woman paramedic killed; 60 wounded, incl. 6 children.",
      ],
      sources: ["Associated Press, 21 Nov 2026", "CNN, 21 Nov 2026"],
    },
  ],
  briefs: [
    { text: "MEXICO: 'EL CHAPO ISIDRO' CAPTURED; 11 KILLED IN SINALOA RAID", source: "Associated Press, 21 Nov 2026" },
    { text: "EU AND INDONESIA SIGN TRADE DEAL AFTER NEARLY 10 YEARS OF TALKS", source: "European Commission / Reuters, 21 Nov 2026" },
    { text: "US STOCKS DOWN 3.7% IN AI SELL-OFF FRIDAY", source: "Associated Press, 20 Nov 2026" },
    { text: "NIGERIA: BOAT TO FUNERAL CAPSIZES; 24 DEAD", source: "Reuters, 22 Nov 2026" },
    { text: "NEPAL PM BALENDRA SHAH ARRIVES IN INDIA", source: "Dainik Jagran, 22 Nov 2026" },
    { text: "CRICKET: INDIA 720/9, LEAD NEW ZEALAND BY 352", source: "Dainik Jagran, 22 Nov 2026" },
  ],
};

// ---------------------------------------------------------------- illustrations
function drawGlobe(cx: number, cy: number, r: number): void {
  // Pale ocean, ochre landmasses, ink outline, red crack.
  ellipse(cx, cy, r, r, TEAL_PALE);
  // Land blobs (stylised continents).
  fillPolygon(
    [
      [cx - 52, cy - 58], [cx - 18, cy - 66], [cx + 2, cy - 48], [cx - 6, cy - 22],
      [cx - 30, cy - 18], [cx - 48, cy - 34],
    ],
    OCHRE,
  );
  fillPolygon(
    [
      [cx + 12, cy - 12], [cx + 44, cy - 26], [cx + 66, cy - 6], [cx + 52, cy + 18],
      [cx + 24, cy + 26], [cx + 6, cy + 8],
    ],
    OCHRE,
  );
  fillPolygon(
    [
      [cx - 62, cy + 26], [cx - 34, cy + 30], [cx - 22, cy + 52], [cx - 46, cy + 62],
      [cx - 66, cy + 46],
    ],
    OCHRE,
  );
  // Latitude / longitude arcs.
  polyline(arcPoints(cx, cy, r * 0.94, r * 0.34, Math.PI, 2 * Math.PI), 2, TEAL);
  polyline(arcPoints(cx, cy, r * 0.94, r * 0.34, 0, Math.PI), 2, TEAL);
  polyline(arcPoints(cx, cy, r * 0.34, r * 0.94, -Math.PI / 2, Math.PI / 2), 2, TEAL);
  polyline(arcPoints(cx, cy, r * 0.34, r * 0.94, Math.PI / 2, (3 * Math.PI) / 2), 2, TEAL);
  polyline(arcPoints(cx, cy, r * 0.62, r * 0.62, 0, 2 * Math.PI), 2, INK);
  // Jagged crack across the globe (scaled to stay inside the circle).
  const cs = 0.8;
  const crack: Pt[] = [
    [cx - 58, cy - 78], [cx - 34, cy - 52], [cx - 44, cy - 30], [cx - 16, cy - 12],
    [cx - 28, cy + 12], [cx + 2, cy + 30], [cx - 6, cy + 54], [cx + 22, cy + 74],
  ].map(([x, y]) => [cx + (x - cx) * cs, cy + (y - cy) * cs] as Pt);
  polyline(crack, 6, RED);
  // Small red shards beside the crack.
  fillPolygon([[cx + 27, cy - 46], [cx + 35, cy - 40], [cx + 29, cy - 35]], RED);
  fillPolygon([[cx - 6, cy + 50], [cx + 2, cy + 56], [cx - 8, cy + 58]], RED);
}

function drawBahrain(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, x + w, y + h, SKY);
  // Sea.
  fillRect(x, y + h * 0.62, x + w, y + h, TEAL);
  // Skyline (Manama towers).
  fillRect(x + 18, y + 52, x + 44, y + h * 0.62, DARK);
  fillRect(x + 52, y + 34, x + 74, y + h * 0.62, DARK);
  fillRect(x + 82, y + 58, x + 104, y + h * 0.62, DARK);
  fillRect(x + 210, y + 46, x + 236, y + h * 0.62, DARK);
  fillRect(x + 244, y + 60, x + 268, y + h * 0.62, DARK);
  // Twin-tower silhouette.
  fillPolygon([[x + 120, y + h * 0.62], [x + 128, y + 30], [x + 140, y + 30], [x + 148, y + h * 0.62]], DARK);
  fillPolygon([[x + 152, y + h * 0.62], [x + 160, y + 30], [x + 172, y + 30], [x + 180, y + h * 0.62]], DARK);
  // Missile arcs (red, dashed by segments) — kept inside the panel.
  const arc1 = arcPoints(x + 150, y + 82, 95, 52, Math.PI * 1.08, Math.PI * 1.92, 24);
  for (let i = 0; i + 1 < arc1.length; i += 2) {
    thickLine(arc1[i][0], arc1[i][1], arc1[i + 1][0], arc1[i + 1][1], 3, RED);
  }
  const arc2 = arcPoints(x + 150, y + 88, 60, 38, Math.PI * 1.1, Math.PI * 1.9, 20);
  for (let i = 0; i + 1 < arc2.length; i += 2) {
    thickLine(arc2[i][0], arc2[i][1], arc2[i + 1][0], arc2[i + 1][1], 3, RED);
  }
  // Burst where the arc lands.
  const bx = x + 178;
  const by = y + 30;
  fillPolygon(
    [
      [bx, by - 16], [bx + 5, by - 5], [bx + 16, by - 4], [bx + 7, by + 3],
      [bx + 10, by + 14], [bx, by + 7], [bx - 10, by + 14], [bx - 7, by + 3],
      [bx - 16, by - 4], [bx - 5, by - 5],
    ],
    ORANGE,
  );
  disc(bx, by, 6, RED);
}

function drawCikande(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, x + w, y + h, SKY);
  // Factory block with sawtooth roof.
  fillRect(x + 20, y + 58, x + w - 24, y + h, DARK);
  fillPolygon(
    [
      [x + 20, y + 58], [x + 70, y + 34], [x + 120, y + 58], [x + 170, y + 34],
      [x + 220, y + 58], [x + w - 24, y + 58], [x + w - 24, y + 58],
    ],
    DARK,
  );
  // Chimney.
  fillRect(x + w - 66, y + 18, x + w - 44, y + 58, DARK);
  // Windows (paper dots).
  for (let i = 0; i < 5; i++) {
    fillRect(x + 36 + i * 44, y + 74, x + 52 + i * 44, y + 88, PAPER);
  }
  // Flames at the roofline.
  fillPolygon([[x + 90, y + 58], [x + 104, y + 30], [x + 118, y + 58]], ORANGE);
  fillPolygon([[x + 112, y + 58], [x + 122, y + 40], [x + 134, y + 58]], RED);
  fillPolygon([[x + 150, y + 58], [x + 162, y + 36], [x + 176, y + 58]], ORANGE);
  // Smoke plume.
  ellipse(x + 108, y + 22, 16, 12, SMOKE);
  ellipse(x + 128, y + 8, 20, 13, SMOKE_DARK);
  ellipse(x + 156, y + 2, 14, 10, SMOKE);
  ellipse(x + 190, y + 10, 18, 12, SMOKE);
}

function drawKryvyiRih(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, x + w, y + h, SKY);
  // Apartment blocks.
  fillRect(x + 16, y + 52, x + 62, y + h, DARK);
  fillRect(x + 70, y + 38, x + 116, y + h, DARK);
  // Damaged, tilted block.
  fillPolygon(
    [
      [x + 130, y + 46], [x + 176, y + 34], [x + 196, y + 84], [x + 150, y + h],
      [x + 126, y + h],
    ],
    DARK,
  );
  fillRect(x + 204, y + 58, x + 248, y + h, DARK);
  fillRect(x + 256, y + 66, x + 288, y + h, DARK);
  // Windows.
  for (let i = 0; i < 3; i++) {
    fillRect(x + 28 + i * 14, y + 62, x + 36 + i * 14, y + 72, PAPER);
    fillRect(x + 82 + i * 14, y + 48, x + 90 + i * 14, y + 58, PAPER);
  }
  // Smoke column rising from the damaged block.
  ellipse(x + 168, y + 26, 15, 11, SMOKE_DARK);
  ellipse(x + 182, y + 10, 19, 12, SMOKE);
  ellipse(x + 204, y + 2, 13, 9, SMOKE_DARK);
  // Small red-cross marker (aid / paramedic).
  fillRect(x + 226, y + 14, x + 252, y + 40, WHITE);
  fillRect(x + 236, y + 18, x + 242, y + 36, RED);
  fillRect(x + 230, y + 24, x + 248, y + 30, RED);
}

// ---------------------------------------------------------------- layout
function rule(y: number, weight: number, c: RGB = INK): void {
  fillRect(30, y, W - 30, y + weight, c);
}

function draw(): void {
  fillRect(0, 0, W, H, PAPER);

  // ---- masthead
  const mastScale = fitScale("THE WORLD", 700, 6.6, 5.5);
  drawText("THE WORLD", W / 2, 28, mastScale, INK, "center");
  rule(132, 2);
  rule(138, 5);
  drawText("SUNDAY, 22 NOVEMBER 2026", 30, 148, 1.7, INK, "left");
  drawText("IN ONE IMAGE", W - 30, 148, 1.7, RED, "right");
  rule(172, 2);

  // ---- lead story: COP31
  drawText("CLIMATE \u00b7 ANTALYA, TURKEY", 30, 184, 1.7, RED, "left");
  drawGlobe(W / 2, 288, 72);
  const hl1 = fitScale("COP31 TALKS", 964, 4.6, 3.5);
  drawText("COP31 TALKS", W / 2, 370, hl1, INK, "center");
  const hl2 = fitScale("SET FOR NO DEAL", 964, 4.6, 3.5);
  drawText("SET FOR NO DEAL", W / 2, 370 + 68, hl2, RED, "center");
  const leadLines = [
    "ANTALYA SUMMIT IN SECOND DAY OF OVERTIME",
    "PRESIDENT: NO NEW DRAFT; FOSSIL-FUEL WORDING DROPPED",
    "EU: \u2018GOOD DEAL OR NO DEAL\u2019; $120BN TARGET DROPPED",
  ];
  let ly = 508;
  for (const ln of leadLines) {
    const s = fitScale(ln, 964, 1.5, 1.2);
    drawText(ln, W / 2, ly, s, INK, "center");
    ly += 24;
  }
  rule(588, 2);

  // ---- secondary stories
  const colW = 304;
  const colX = [30, 360, 690];
  const secY = 600;
  const secondaries: {
    kicker: string;
    head: [string, string];
    facts: [string, string];
    draw: (x: number, y: number, w: number, h: number) => void;
  }[] = [
    {
      kicker: "BAHRAIN",
      head: ["IRAN STRIKES", "US BASES"],
      facts: ["TEHRAN CLAIMS", "PATRIOT RADARS HIT"],
      draw: drawBahrain,
    },
    {
      kicker: "CIKANDE",
      head: ["FACTORY FIRE", "IN CIKANDE"],
      facts: ["3 DEAD, 36 MISSING", "SEARCH GOES ON"],
      draw: drawCikande,
    },
    {
      kicker: "KRYVYI RIH",
      head: ["MISSILES HIT", "ZELENSKYY\u2019S HOME"],
      facts: ["2 KILLED,", "60 WOUNDED"],
      draw: drawKryvyiRih,
    },
  ];
  for (let i = 0; i < 3; i++) {
    const s = secondaries[i];
    const x = colX[i];
    s.draw(x, secY, colW, 106);
    drawText(s.kicker, x, secY + 114, 1.5, RED, "left");
    const hs = Math.min(fitScale(s.head[0], colW, 1.85, 1.4), fitScale(s.head[1], colW, 1.85, 1.4));
    drawText(s.head[0], x, secY + 140, hs, INK, "left");
    drawText(s.head[1], x, secY + 170, hs, INK, "left");
    const fs = Math.min(fitScale(s.facts[0], colW, 1.45, 1.2), fitScale(s.facts[1], colW, 1.45, 1.2));
    drawText(s.facts[0], x, secY + 200, fs, INK, "left");
    drawText(s.facts[1], x, secY + 222, fs, INK, "left");
  }
  rule(852, 2);

  // ---- footer: IN BRIEF
  drawText("IN BRIEF", 30, 862, 1.7, RED, "left");
  drawText("SOURCES: REUTERS, AP, AL JAZEERA", W - 30, 866, 1.1, GREY, "right");
  const briefs = [
    "MEXICO: \u2018EL CHAPO ISIDRO\u2019 CAPTURED; 11 KILLED IN SINALOA RAID",
    "EU AND INDONESIA SIGN TRADE DEAL AFTER NEARLY 10 YEARS OF TALKS",
    "US STOCKS DOWN 3.7% IN AI SELL-OFF FRIDAY",
    "NIGERIA: BOAT TO FUNERAL CAPSIZES; 24 DEAD",
    "NEPAL PM BALENDRA SHAH ARRIVES IN INDIA",
    "CRICKET: INDIA 720/9, LEAD NEW ZEALAND BY 352",
  ];
  let by = 890;
  for (const b of briefs) {
    disc(38, by + 7, 3, RED);
    const s = fitScale(b, 940, 1.42, 1.1);
    drawText(b, 50, by, s, INK, "left");
    by += 21;
  }
}

// ---------------------------------------------------------------- main
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  fs.mkdirSync(outDir, { recursive: true });
  draw();
  const png = encodePNG();
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
  fs.writeFileSync(path.join(outDir, "dossier.json"), JSON.stringify(DOSSIER, null, 2) + "\n");
}

main();
