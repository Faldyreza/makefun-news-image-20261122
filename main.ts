// main.ts — news-image-20261122 v2 "THE WORLD — SUNDAY, 22 NOVEMBER 2026"
// A program that draws one newspaper front page summing up the world's news of
// Sunday 22 November 2026 and writes it to /output/entry.png (1024x1024 PNG,
// <= 1 MiB) plus /output/dossier.json. Node 22 stdlib only, no network at run
// time, fully deterministic: two runs produce byte-identical files.
//
// v2 vs v1: (1) headline/masthead glyphs are now BOLD — each stroke is drawn
// twice with a horizontal offset on top of a thicker stroke, so text stays
// readable at ~300 px thumbnail size; (2) the lead globe is bigger (r 82) and
// drawn as a recognisable Earth — green continents (Americas, Africa,
// Eurasia, Australia), blue ocean, polar cap, graticule; (3) the redundant
// second Bahrain missile arc is gone — one arc only; (4) every story is a
// 22 Nov 2026 event (Kryvyi Rih / Mexico / EU-Indonesia / US stocks are
// dropped; the Ukraine secondary is now the 22 Nov Dymer drone strike);
// (5) all three secondary headlines share ONE scale, so none is smaller.
//
// FACTS (verified live from reputable sources on 22 Nov 2026; see dossier.json
// for the source of every fact — no invented numbers, quotes or casualties):
//  LEAD — COP31, Antalya: talks in a second day of overtime on Sunday, set
//    to end with no deal; summit president Murat Kurum: no new draft of the
//    deal; the draft dropped fossil-fuel wording and a proposed $120bn
//    adaptation-finance target; EU climate chief Wopke Hoekstra: "good deal
//    or no deal". (Reuters, 21-22 Nov)
//  BAHRAIN: Iran's IRGC claims missile-and-drone strikes on US positions at
//    Al-Riffa and Awali bases, saying it hit two Patriot radars; Bahrain says
//    a civilian industrial facility was hit (fire, no injuries) and its air
//    defences intercepted other attacks. (Al Jazeera via ANI / Xinhua /
//    Iran Press, 22 Nov)
//  CIKANDE, INDONESIA: fire at the PT Fonusa Agung Mulia candy factory broke
//    out Saturday 17:00; 3 dead, 36 missing, 15 rescued alive (4 injured);
//    search still under way on Sunday. (AP / Reuters, 22 Nov)
//  KYIV REGION, UKRAINE: a Russian drone struck a five-storey residential
//    building in Dymer on Sunday morning; 14 people still missing, 9
//    evacuated, fire contained. (Reuters, 22 Nov)
//  IN BRIEF (all 22 Nov) — Nigeria: boat carrying mourners to a funeral
//    capsized in Bayelsa; death toll 24. (Reuters) / Nepal PM Balendra Shah
//    arrived in India for a two-day state visit, his first foreign trip as
//    PM. (IANS) / Cricket: India declared 720/9, leading New Zealand by 352
//    in the Wellington Test. (ESPNcricinfo) / F1: Verstappen won the Las
//    Vegas Grand Prix, his third win there. (Reuters) / South Africa: flags
//    at half-mast from Sunday for Phumzile Mlambo-Ngcuka; state funeral
//    28 Nov. (SA News) / NATO council to meet Monday over Russian missiles
//    that landed in Poland. (EU Today)

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
const OCEAN: RGB = [168, 204, 208];
const LAND: RGB = [104, 158, 96];
const LAND_DARK: RGB = [82, 132, 76];
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

// Points along an ellipse arc (angles in radians, y down).
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
// Bold rendering (see drawText) draws every stroke twice with a horizontal
// offset on top of a thicker stroke, so glyphs read as solid letters.
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
  "\u2018": "5,0 6,4",
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

// weight 1 = v1 outline look; weight > 1 draws every stroke twice (offset
// +/-dx/2 horizontally) with a thicker stroke, so glyphs become solid bold.
function drawText(
  text: string,
  x: number,
  yTop: number,
  scale: number,
  c: RGB,
  align: "left" | "center" | "right" = "left",
  weight = 1,
): void {
  const w = measure(text, scale);
  let cx = x;
  if (align === "center") cx = x - w / 2;
  if (align === "right") cx = x - w;
  const strokeW = Math.max(1.5, scale * 1.28 * weight);
  const dx = weight > 1.05 ? scale * 0.55 : 0;
  const offsets = dx > 0 ? [-dx / 2, dx / 2] : [0];
  for (const off of offsets) {
    let px0 = cx + off;
    for (const ch of text) {
      const glyph = GLYPHS[ch.toUpperCase()];
      if (glyph) {
        for (const stroke of glyph) {
          const pts: Pt[] = stroke.map(([gx, gy]) => [px0 + gx * scale, yTop + gy * scale]);
          if (pts.length === 1) disc(pts[0][0], pts[0][1], strokeW / 2, c);
          else polyline(pts, strokeW, c);
        }
      }
      px0 += ADVANCE * scale;
    }
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
  edition: "v2",
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
      sources: [
        "Reuters, 22 Nov 2026 — COP31 climate talks set to collapse without political deal",
        "Reuters, 21-22 Nov 2026 — COP31 climate summit risks failure as talks go deep into overtime",
      ],
    },
    {
      slot: "secondary-1",
      kicker: "BAHRAIN",
      headline: "IRAN STRIKES US BASES",
      facts: [
        "Iran's IRGC claims missile-and-drone strikes on US positions at Al-Riffa and Awali bases, saying it hit two Patriot radars.",
        "Bahrain says a civilian industrial facility was hit (fire, no injuries) and air defences intercepted other attacks.",
      ],
      sources: [
        "Al Jazeera via ANI, 22 Nov 2026",
        "Xinhua, 22 Nov 2026",
        "Iran Press, 22 Nov 2026",
      ],
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
      kicker: "KYIV REGION, UKRAINE",
      headline: "DRONE HITS KYIV FLAT",
      facts: [
        "A Russian drone struck a five-storey residential building in Dymer, Kyiv region, on Sunday morning.",
        "14 people still missing; 9 evacuated, fire contained.",
      ],
      sources: ["Reuters, 22 Nov 2026"],
    },
  ],
  briefs: [
    { text: "NIGERIA: BOAT TO FUNERAL CAPSIZES; 24 DEAD", source: "Reuters, 22 Nov 2026" },
    { text: "NEPAL PM BALENDRA SHAH ARRIVES IN INDIA", source: "IANS, 22 Nov 2026" },
    { text: "CRICKET: INDIA 720/9, LEAD NEW ZEALAND BY 352", source: "ESPNcricinfo, 22 Nov 2026" },
    { text: "F1: VERSTAPPEN WINS LAS VEGAS GRAND PRIX", source: "Reuters, 22 Nov 2026" },
    { text: "SOUTH AFRICA: FLAGS AT HALF-MAST FOR MLAMBO-NGCUKA", source: "SA News, 22 Nov 2026" },
    { text: "NATO TO MEET MONDAY OVER MISSILES IN POLAND", source: "EU Today, 22 Nov 2026" },
  ],
};

// ---------------------------------------------------------------- illustrations
// The Earth: blue ocean, green continents in recognisable shapes, white
// polar cap, thin graticule, and one small red crack (a summit in trouble).
function drawGlobe(cx: number, cy: number, r: number): void {
  const rel = (pts: [number, number][]): Pt[] =>
    pts.map(([dx, dy]) => [cx + dx, cy + dy] as Pt);
  ellipse(cx, cy, r, r, OCEAN);
  // Continents — all vertices kept inside the disc (radius < r - 2).
  fillPolygon(rel([[-62, -38], [-48, -58], [-24, -60], [-8, -46], [-16, -30], [-36, -24], [-52, -28]]), LAND); // N America
  fillPolygon(rel([[-30, -68], [-18, -70], [-14, -60], [-26, -58]]), LAND); // Greenland
  fillPolygon(rel([[-30, 2], [-12, -2], [0, 16], [-6, 44], [-20, 52], [-30, 30], [-34, 14]]), LAND); // S America
  fillPolygon(rel([[14, -34], [38, -40], [52, -22], [48, 2], [34, 18], [22, 10], [14, -8], [8, -24]]), LAND); // Africa
  fillPolygon(rel([[28, -52], [54, -56], [66, -40], [62, -28], [48, -28], [40, -42]]), LAND); // Eurasia
  fillPolygon(rel([[48, 34], [64, 36], [64, 46], [50, 50], [44, 40]]), LAND); // Australia
  // Graticule: equator + one meridian, drawn over the land like a map.
  polyline(arcPoints(cx, cy, r * 0.97, r * 0.3, 0, Math.PI * 2, 48), 2, TEAL);
  polyline(arcPoints(cx, cy, r * 0.3, r * 0.97, 0, Math.PI * 2, 48), 2, TEAL);
  // White polar cap (a modest slice at the top of the disc).
  const cap = arcPoints(cx, cy, r * 0.995, r * 0.995, (Math.PI * 228) / 180, (Math.PI * 312) / 180, 24);
  fillPolygon(cap, WHITE);
  // Ink outline of the disc.
  polyline(arcPoints(cx, cy, r, r, 0, Math.PI * 2, 72), 3, INK);
  // One small jagged crack in the lower-right ocean.
  const crack: Pt[] = rel([[18, 26], [30, 36], [24, 46], [38, 52], [32, 60], [44, 62]]);
  polyline(crack, 4, RED);
  fillPolygon(rel([[52, 38], [58, 44], [50, 46]]), RED);
  fillPolygon(rel([[6, 56], [12, 62], [4, 64]]), RED);
}

// Bahrain: Manama skyline under a single red missile arc.
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
  // ONE missile arc (red, dashed by segments).
  const arc = arcPoints(x + 150, y + 82, 95, 52, Math.PI * 1.08, Math.PI * 1.92, 24);
  for (let i = 0; i + 1 < arc.length; i += 2) {
    thickLine(arc[i][0], arc[i][1], arc[i + 1][0], arc[i + 1][1], 3.5, RED);
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

// Cikande: candy factory with sawtooth roof, flames and smoke.
function drawCikande(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, x + w, y + h, SKY);
  // Factory block with sawtooth roof.
  fillRect(x + 20, y + 58, x + w - 24, y + h, DARK);
  fillPolygon(
    [
      [x + 20, y + 58], [x + 70, y + 34], [x + 120, y + 58], [x + 170, y + 34],
      [x + 220, y + 58], [x + w - 24, y + 58],
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

// Dymer, Kyiv region: a five-storey block with a collapsed middle section,
// smoke, a rescue ladder and a small aid marker.
function drawKyiv(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, x + w, y + h, SKY);
  // Intact block on the left.
  fillRect(x + 14, y + 40, x + 106, y + h, DARK);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      fillRect(x + 26 + c * 28, y + 50 + r * 14, x + 36 + c * 28, y + 58 + r * 14, PAPER);
    }
  }
  // Damaged block in the middle: two standing parts, jagged gap, rubble.
  fillPolygon(
    [
      [x + 118, y + 34], [x + 150, y + 34], [x + 150, y + h], [x + 118, y + h],
    ],
    DARK,
  );
  fillPolygon(
    [
      [x + 170, y + 38], [x + 198, y + 38], [x + 198, y + h], [x + 170, y + h],
    ],
    DARK,
  );
  // Exposed floor slabs inside the gap.
  thickLine(x + 152, y + 56, x + 168, y + 56, 3, DARK);
  thickLine(x + 152, y + 76, x + 168, y + 76, 3, DARK);
  // Rubble mound at the foot of the gap.
  fillPolygon(
    [
      [x + 146, y + h], [x + 152, y + 88], [x + 160, y + 96], [x + 168, y + 88],
      [x + 174, y + h],
    ],
    SMOKE_DARK,
  );
  // Windows on the standing parts.
  fillRect(x + 126, y + 44, x + 136, y + 54, PAPER);
  fillRect(x + 126, y + 66, x + 136, y + 76, PAPER);
  fillRect(x + 178, y + 48, x + 188, y + 58, PAPER);
  fillRect(x + 178, y + 70, x + 188, y + 80, PAPER);
  // Intact block on the right.
  fillRect(x + 208, y + 52, x + 290, y + h, DARK);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      fillRect(x + 220 + c * 24, y + 62 + r * 14, x + 230 + c * 24, y + 70 + r * 14, PAPER);
    }
  }
  // Smoke column rising from the gap.
  ellipse(x + 158, y + 24, 14, 10, SMOKE_DARK);
  ellipse(x + 172, y + 10, 18, 11, SMOKE);
  ellipse(x + 192, y + 2, 12, 8, SMOKE_DARK);
  // Rescue ladder leaning into the gap.
  thickLine(x + 118, y + h, x + 152, y + 62, 2.5, INK);
  thickLine(x + 126, y + h, x + 160, y + 62, 2.5, INK);
  for (let i = 0; i < 4; i++) {
    const t = 0.2 + i * 0.2;
    thickLine(x + 118 + 34 * t, y + h - (y + h - 62) * t, x + 126 + 34 * t, y + h - (y + h - 62) * t, 2, INK);
  }
  // Small aid marker (white square, red cross).
  fillRect(x + 246, y + 12, x + 268, y + 34, WHITE);
  fillRect(x + 255, y + 16, x + 259, y + 30, RED);
  fillRect(x + 250, y + 21, x + 264, y + 25, RED);
}

// ---------------------------------------------------------------- layout
function rule(y: number, weight: number, c: RGB = INK): void {
  fillRect(30, y, W - 30, y + weight, c);
}

function draw(): void {
  fillRect(0, 0, W, H, PAPER);

  // ---- masthead (bold so it survives the 300 px thumbnail)
  const mastScale = fitScale("THE WORLD", 700, 6.6, 5.5);
  drawText("THE WORLD", W / 2, 28, mastScale, INK, "center", 1.7);
  rule(132, 2);
  rule(138, 5);
  drawText("SUNDAY, 22 NOVEMBER 2026", 30, 148, 1.7, INK, "left", 1.3);
  drawText("IN ONE IMAGE", W - 30, 148, 1.7, RED, "right", 1.3);
  rule(172, 2);

  // ---- lead story: COP31
  drawText("CLIMATE \u00b7 ANTALYA, TURKEY", 30, 180, 1.7, RED, "left", 1.35);
  drawGlobe(W / 2, 289, 82);
  const hl = fitScale("SET FOR NO DEAL", 964, 4.6, 3.5);
  drawText("COP31 TALKS", W / 2, 378, hl, INK, "center", 1.6);
  drawText("SET FOR NO DEAL", W / 2, 446, hl, RED, "center", 1.6);
  const leadLines = [
    "ANTALYA SUMMIT IN SECOND DAY OF OVERTIME",
    "PRESIDENT: NO NEW DRAFT; FOSSIL-FUEL WORDING DROPPED",
    "EU: \u2018GOOD DEAL OR NO DEAL\u2019; $120BN TARGET DROPPED",
  ];
  let ly = 516;
  for (const ln of leadLines) {
    const s = fitScale(ln, 964, 1.5, 1.2);
    drawText(ln, W / 2, ly, s, INK, "center", 1.3);
    ly += 24;
  }
  rule(590, 2);

  // ---- secondary stories (ONE headline scale for all three)
  const colW = 304;
  const colX = [30, 360, 690];
  const secY = 602;
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
      kicker: "KYIV REGION",
      head: ["DRONE HITS", "KYIV FLAT"],
      facts: ["14 STILL MISSING", "9 EVACUATED"],
      draw: drawKyiv,
    },
  ];
  let hs = 1.85;
  for (const s of secondaries) {
    hs = Math.min(hs, fitScale(s.head[0], colW, 1.85, 1.4), fitScale(s.head[1], colW, 1.85, 1.4));
  }
  for (let i = 0; i < 3; i++) {
    const s = secondaries[i];
    const x = colX[i];
    s.draw(x, secY, colW, 106);
    drawText(s.kicker, x, secY + 114, 1.5, RED, "left", 1.35);
    drawText(s.head[0], x, secY + 140, hs, INK, "left", 1.5);
    drawText(s.head[1], x, secY + 170, hs, INK, "left", 1.5);
    const fs = Math.min(fitScale(s.facts[0], colW, 1.45, 1.2), fitScale(s.facts[1], colW, 1.45, 1.2));
    drawText(s.facts[0], x, secY + 200, fs, INK, "left", 1.25);
    drawText(s.facts[1], x, secY + 222, fs, INK, "left", 1.25);
  }
  rule(852, 2);

  // ---- footer: IN BRIEF (all 22 Nov 2026)
  drawText("IN BRIEF", 30, 862, 1.7, RED, "left", 1.35);
  drawText("SOURCES: REUTERS, AP, AL JAZEERA, IANS", W - 30, 866, 1.1, GREY, "right", 1.15);
  const briefs = [
    "NIGERIA: BOAT TO FUNERAL CAPSIZES; 24 DEAD",
    "NEPAL PM BALENDRA SHAH ARRIVES IN INDIA",
    "CRICKET: INDIA 720/9, LEAD NEW ZEALAND BY 352",
    "F1: VERSTAPPEN WINS LAS VEGAS GRAND PRIX",
    "SOUTH AFRICA: FLAGS AT HALF-MAST FOR MLAMBO-NGCUKA",
    "NATO TO MEET MONDAY OVER MISSILES IN POLAND",
  ];
  let by = 890;
  for (const b of briefs) {
    disc(38, by + 7, 3, RED);
    const s = fitScale(b, 940, 1.42, 1.1);
    drawText(b, 50, by, s, INK, "left", 1.2);
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
