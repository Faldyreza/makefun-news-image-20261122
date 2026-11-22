// news-image-20261122 v3 — "THE WORLD", Sunday 22 November 2026.
// A one-image newspaper front page, drawn procedurally with Node 22 stdlib only.
// No network at run time. Writes /output/entry.png (1024x1024) + /output/dossier.json.
// Deterministic: same bytes on every run.
//
// FACTS — every fact below was verified live on 22 Nov 2026 from reputable
// sources (Reuters, AP, Al Jazeera, Xinhua, IANS, ESPNcricinfo, SA News, EU Today).
// Nothing here is invented: no made-up numbers, quotes or casualty figures.
// - LEAD, COP31 Antalya: talks in a second day of overtime, heading for no deal;
//   COP31 president Murat Kurum: no new draft; draft dropped fossil-fuel wording
//   and the $120bn adaptation-finance target; EU's Wopke Hoekstra: "good deal or
//   no deal". (Reuters, 21-22 Nov 2026)
// - BAHRAIN: IRGC claims missile + drone strikes on US positions at Al-Riffa and
//   Awali, claims two Patriot radars hit; Bahrain says a civilian industrial
//   facility was hit and caught fire, air defences intercepted other attacks.
//   (Al Jazeera via ANI, Xinhua, 22 Nov 2026)
// - CIKANDE, Indonesia: fire at the PT Fonusa Agung Mulia candy factory, Sat
//   17:00; 3 dead, 36 missing, 15 rescued (4 injured); search continued Sunday.
//   (AP, Reuters, 22 Nov 2026)
// - KYIV REGION: Russian drone hit a five-storey flat block in Dymer, Sunday
//   morning; 14 missing, 9 evacuated, fire put out. (Reuters, 22 Nov 2026)
// - BRIEFS (all 22 Nov): Nigeria — boat to a funeral capsized, 24 dead
//   (Reuters); Nepal PM Balendra Shah arrived in India, first foreign visit
//   (IANS); cricket — India 720/9, lead New Zealand by 352 (ESPNcricinfo);
//   F1 — Verstappen won the Las Vegas Grand Prix (Reuters); South Africa —
//   flags at half-mast from Sunday for Phumzile Mlambo-Ngcuka (SA News);
//   NATO council to meet Monday over Russian missiles in Poland (EU Today).

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type RGB = [number, number, number];

const W = 1024;
const H = 1024;
const PAPER: RGB = [243, 237, 222];
const INK: RGB = [28, 24, 19];
const RED: RGB = [168, 31, 31];
const GRAY: RGB = [107, 101, 90];
const OCEAN: RGB = [188, 216, 222];
const LAND: RGB = [124, 171, 104];
const LAND_DARK: RGB = [93, 138, 76];
const GRAT: RGB = [74, 125, 140];
const CAP: RGB = [238, 244, 242];
const ORANGE: RGB = [232, 100, 30];
const AMBER: RGB = [242, 160, 7];
const SEA: RGB = [47, 125, 122];
const DARK: RGB = [38, 48, 58];
const DARK2: RGB = [51, 56, 61];
const DARK3: RGB = [58, 63, 69];
const RUBBLE: RGB = [107, 111, 117];
const SMOKE: RGB = [138, 143, 148];
const WIN_LIT: RGB = [242, 217, 140];
const WIN_DARK: RGB = [32, 36, 42];
const LADDER: RGB = [122, 74, 33];
const WHITE: RGB = [250, 248, 242];

const buf = new Uint8Array(W * H * 3);

// ---------------------------------------------------------------- raster ----
function setPx(x: number, y: number, c: RGB): void {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      i += 3;
    }
  }
}

function fillDisc(cx: number, cy: number, r: number, c: RGB): void {
  const rr = Math.max(0.5, r);
  const y0 = Math.max(0, Math.floor(cy - rr));
  const y1 = Math.min(H - 1, Math.ceil(cy + rr));
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    const dx = Math.sqrt(Math.max(0, rr * rr - dy * dy));
    const x0 = Math.max(0, Math.ceil(cx - dx));
    const x1 = Math.min(W - 1, Math.floor(cx + dx));
    if (x1 >= x0) fillRect(x0, y, x1 - x0 + 1, 1, c);
  }
}

interface Clip {
  cx: number;
  cy: number;
  r: number;
}

function fillPoly(pts: [number, number][], c: RGB, clip?: Clip): void {
  if (pts.length < 3) return;
  let minY = Math.floor(Math.min(...pts.map((p) => p[1])));
  let maxY = Math.ceil(Math.max(...pts.map((p) => p[1])));
  minY = Math.max(minY, 0);
  maxY = Math.min(maxY, H - 1);
  for (let y = minY; y <= maxY; y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= yc && y2 > yc) || (y2 <= yc && y1 > yc)) {
        xs.push(x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      let x0 = Math.ceil(xs[k]);
      let x1 = Math.floor(xs[k + 1]);
      if (clip) {
        const dy = yc - clip.cy;
        if (Math.abs(dy) > clip.r) continue;
        const dx = Math.sqrt(clip.r * clip.r - dy * dy);
        x0 = Math.max(x0, Math.ceil(clip.cx - dx));
        x1 = Math.min(x1, Math.floor(clip.cx + dx));
      }
      if (x1 >= x0) fillRect(x0, y, x1 - x0 + 1, 1, c);
    }
  }
}

function thickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) {
    fillDisc(x0, y0, w / 2, c);
    return;
  }
  const nx = (-dy / len) * (w / 2);
  const ny = (dx / len) * (w / 2);
  fillPoly(
    [
      [x0 + nx, y0 + ny],
      [x1 + nx, y1 + ny],
      [x1 - nx, y1 - ny],
      [x0 - nx, y0 - ny],
    ],
    c,
  );
  fillDisc(x0, y0, w / 2, c);
  fillDisc(x1, y1, w / 2, c);
}

function polyline(pts: [number, number][], w: number, c: RGB): void {
  for (let i = 0; i + 1 < pts.length; i++) {
    thickLine(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, c);
  }
}

// ------------------------------------------------------- stroke bitmap font -
// Hand-drawn condensed sans on a 6-wide by 9-tall unit grid (y = 0 top).
// Each glyph: [advance width in units, list of strokes, each a point list].
// A zero-length stroke draws as a round dot (used for . : ; ! ? and middot).
type Glyph = [number, number[][][]];
const GLYPHS: Record<string, Glyph> = {
  A: [6, [[[0, 9], [3, 0], [6, 9]], [[1.4, 6], [4.6, 6]]]],
  B: [6, [[[0, 0], [0, 9]], [[0, 0], [3.8, 0], [5.4, 1.4], [5.4, 3.2], [4, 4.5], [0, 4.5]], [[0, 4.5], [4, 4.5], [5.4, 6], [5.4, 7.6], [4, 9], [0, 9]]]],
  C: [6, [[[5.4, 1.6], [4, 0], [2, 0], [0, 1.6], [0, 7.4], [2, 9], [4, 9], [5.4, 7.4]]]],
  D: [6, [[[0, 0], [0, 9]], [[0, 0], [3.6, 0], [5.6, 2], [5.6, 7], [3.6, 9], [0, 9]]]],
  E: [6, [[[0, 0], [0, 9]], [[0, 0], [5.2, 0]], [[0, 4.5], [4.2, 4.5]], [[0, 9], [5.2, 9]]]],
  F: [6, [[[0, 0], [0, 9]], [[0, 0], [5.2, 0]], [[0, 4.5], [4.2, 4.5]]]],
  G: [6, [[[5.4, 1.6], [4, 0], [2, 0], [0, 1.6], [0, 7.4], [2, 9], [4, 9], [5.4, 7.4], [5.4, 5], [3, 5]]]],
  H: [6, [[[0, 0], [0, 9]], [[6, 0], [6, 9]], [[0, 4.5], [6, 4.5]]]],
  I: [3.4, [[[1.7, 0], [1.7, 9]], [[0, 0], [3.4, 0]], [[0, 9], [3.4, 9]]]],
  J: [5, [[[1, 0], [4.6, 0]], [[3.4, 0], [3.4, 6.8], [2.2, 9], [0.8, 9], [0, 7.8]]]],
  K: [6, [[[0, 0], [0, 9]], [[5.6, 0], [0.6, 4.6]], [[1.8, 5.4], [5.6, 9]]]],
  L: [6, [[[0, 0], [0, 9]], [[0, 9], [5.4, 9]]]],
  M: [7, [[[0, 9], [0, 0], [3.5, 5.2], [7, 0], [7, 9]]]],
  N: [6.6, [[[0, 9], [0, 0], [6.6, 9], [6.6, 0]]]],
  O: [6.4, [[[1.6, 0], [4.8, 0], [6.4, 1.6], [6.4, 7.4], [4.8, 9], [1.6, 9], [0, 7.4], [0, 1.6], [1.6, 0]]]],
  P: [6, [[[0, 0], [0, 9]], [[0, 0], [4, 0], [5.6, 1.6], [5.6, 3.4], [4, 5], [0, 5]]]],
  Q: [6.4, [[[1.6, 0], [4.8, 0], [6.4, 1.6], [6.4, 7.4], [4.8, 9], [1.6, 9], [0, 7.4], [0, 1.6], [1.6, 0]], [[3.6, 6.4], [6.6, 9.6]]]],
  R: [6, [[[0, 0], [0, 9]], [[0, 0], [4, 0], [5.6, 1.6], [5.6, 3.4], [4, 5], [0, 5]], [[2.2, 5], [6, 9]]]],
  S: [6, [[[5.4, 1.6], [4, 0], [2, 0], [0, 1.6], [0, 3.4], [1.6, 4.5], [4.4, 4.5], [6, 5.6], [6, 7.4], [4, 9], [2, 9], [0, 7.4]]]],
  T: [6, [[[0, 0], [6, 0]], [[3, 0], [3, 9]]]],
  U: [6.4, [[[0, 0], [0, 7], [1.6, 9], [4.8, 9], [6.4, 7], [6.4, 0]]]],
  V: [6.4, [[[0, 0], [3.2, 9], [6.4, 0]]]],
  W: [8, [[[0, 0], [2, 9], [4, 4.6], [6, 9], [8, 0]]]],
  X: [6, [[[0, 0], [6, 9]], [[6, 0], [0, 9]]]],
  Y: [6, [[[0, 0], [3, 4.6], [6, 0]], [[3, 4.6], [3, 9]]]],
  Z: [6, [[[0, 0], [6, 0], [0, 9], [6, 9]]]],
  "0": [6.4, [[[1.6, 0], [4.8, 0], [6.4, 1.6], [6.4, 7.4], [4.8, 9], [1.6, 9], [0, 7.4], [0, 1.6], [1.6, 0]], [[1.8, 7], [4.6, 2]]]],
  "1": [4, [[[2.8, 0], [2.8, 9]], [[1, 2.4], [2.8, 0]], [[0.6, 9], [4, 9]]]],
  "2": [6, [[[0.4, 1.8], [1.8, 0], [4.4, 0], [6, 1.6], [6, 3.6], [0.4, 9], [6, 9]]]],
  "3": [6, [[[0.4, 1.6], [1.8, 0], [4.2, 0], [5.8, 1.6], [5.8, 3.4], [4.4, 4.5], [1.2, 4.5]], [[3.4, 4.5], [5, 4.5], [6, 6], [6, 7.4], [4.4, 9], [1.8, 9], [0.4, 7.6]]]],
  "4": [6, [[[0, 6.2], [4.6, 0], [4.6, 9]], [[0, 6.2], [5.8, 6.2]]]],
  "5": [6, [[[5.6, 0], [0.4, 0], [0.4, 4], [3.6, 4], [5.6, 5.6], [5.6, 7.4], [4, 9], [1.8, 9], [0.4, 7.6]]]],
  "6": [6, [[[5.2, 1.4], [3.6, 0], [1.8, 0], [0.4, 1.8], [0.4, 7.2], [1.8, 9], [4.2, 9], [5.8, 7.4], [5.8, 5.6], [4.4, 4.2], [2, 4.2], [0.8, 5.6]]]],
  "7": [6, [[[0, 0], [6, 0], [2.6, 9]]]],
  "8": [6.4, [[[1.6, 0], [4.8, 0], [6.4, 1.6], [6.4, 7.4], [4.8, 9], [1.6, 9], [0, 7.4], [0, 1.6], [1.6, 0]], [[0, 4.5], [6.4, 4.5]]]],
  "9": [6, [[[1, 7.6], [2.4, 9], [4.2, 9], [5.8, 7.2], [5.8, 1.8], [4.2, 0], [1.8, 0], [0.4, 1.8], [0.4, 3.4], [1.8, 4.8], [4.2, 4.8], [5.4, 3.4]]]],
  " ": [4, []],
  ".": [3, [[[1.5, 8.2], [1.5, 8.2]]]],
  ",": [3, [[[1.5, 8.2], [1.5, 8.2]], [[1.6, 8.8], [0.8, 10.2]]]],
  ":": [3, [[[1.5, 3.4], [1.5, 3.4]], [[1.5, 8.2], [1.5, 8.2]]]],
  ";": [3, [[[1.5, 3.4], [1.5, 3.4]], [[1.5, 8.2], [1.5, 8.2]], [[1.6, 8.8], [0.8, 10.2]]]],
  "'": [2.6, [[[1.6, 0], [1, 2.4]]]],
  '"': [4.6, [[[1.4, 0], [0.9, 2.2]], [[3.4, 0], [2.9, 2.2]]]],
  "-": [6, [[[0.6, 4.5], [5.4, 4.5]]]],
  "—": [6, [[[0, 4.5], [6, 4.5]]]],
  $: [6, [[[5.4, 1.6], [4, 0], [2, 0], [0, 1.6], [0, 3.4], [1.6, 4.5], [4.4, 4.5], [6, 5.6], [6, 7.4], [4, 9], [2, 9], [0, 7.4]], [[3, -1.2], [3, 10.2]]]],
  "%": [7, [[[1.6, 1.2], [1.6, 1.2]], [[5.4, 7.8], [5.4, 7.8]], [[6, 0.4], [1, 8.6]]]],
  "/": [5, [[[4.2, 0], [0.8, 9]]]],
  "(": [3.6, [[[3, 0], [1.2, 2.2], [1.2, 6.8], [3, 9]]]],
  ")": [3.6, [[[0.6, 0], [2.4, 2.2], [2.4, 6.8], [0.6, 9]]]],
  "+": [6, [[[3, 2.2], [3, 6.8]], [[0.6, 4.5], [5.4, 4.5]]]],
  "!": [3, [[[1.5, 0], [1.5, 6.4]], [[1.5, 8.2], [1.5, 8.2]]]],
  "?": [6, [[[1.2, 2], [2.4, 0], [4, 0], [5.2, 1.6], [5.2, 3.2], [3.6, 4.8], [3, 5.4], [3, 6.6]], [[3, 8.2], [3, 8.2]]]],
  "·": [3, [[[1.5, 4.4], [1.5, 4.4]]]],
  "&": [6, [[[4.6, 1.2], [3.2, 0], [1.6, 1], [1.2, 2.8], [3, 4.6], [5.4, 6.2], [5.8, 7.6], [4.4, 9], [2.2, 9], [0.8, 7.6], [2.4, 5.6], [4.6, 3.4]]]],
  "=": [6, [[[0.6, 3.4], [5.4, 3.4]], [[0.6, 6], [5.4, 6]]]],
};

interface TextOpts {
  align?: "left" | "center" | "right";
  bold?: boolean;
  tracking?: number;
}

function textWidth(s: string, capH: number, tracking = 0): number {
  const u = capH / 9;
  let units = 0;
  for (const ch of s) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    units += g[0] + 1 + tracking;
  }
  units -= 1 + tracking;
  return units * u;
}

function drawText(s: string, x: number, yTop: number, capH: number, c: RGB, opts: TextOpts = {}): void {
  const tracking = opts.tracking ?? 0;
  const u = capH / 9;
  const w = textWidth(s, capH, tracking);
  let cx = x;
  if (opts.align === "center") cx = x - w / 2;
  if (opts.align === "right") cx = x - w;
  const bold = opts.bold ?? false;
  const strokeW = bold ? 1.3 * u : 1.0 * u;
  const passes = bold ? [0, 0.45 * u] : [0];
  for (const ch of s) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (const off of passes) {
      for (const stroke of g[1]) {
        const pts: [number, number][] = stroke.map(([gx, gy]) => [cx + off + gx * u, yTop + gy * u]);
        polyline(pts, strokeW, c);
      }
    }
    cx += (g[0] + 1 + tracking) * u;
  }
}

// ----------------------------------------------------------------- globe ----
// Rough continent outlines as [longitude, latitude] polygons, drawn by hand
// from a world map in memory. Orthographic projection centred on lon 12, lat 24.
const CONTINENTS: number[][][] = [
  // North America
  [[-168, 66], [-165, 60], [-158, 58], [-152, 60], [-140, 60], [-135, 58], [-130, 54], [-125, 49], [-124, 42], [-120, 34], [-114, 29], [-110, 24], [-105, 20], [-97, 16], [-94, 17], [-90, 14], [-86, 12], [-83, 9], [-79, 9], [-80, 13], [-84, 16], [-87, 21], [-90, 21], [-91, 19], [-96, 19], [-97, 26], [-93, 30], [-89, 30], [-84, 30], [-81, 25], [-80, 32], [-76, 35], [-74, 39], [-70, 42], [-68, 45], [-65, 44], [-60, 47], [-55, 47], [-60, 52], [-64, 58], [-68, 58], [-72, 62], [-78, 62], [-85, 66], [-92, 66], [-95, 69], [-110, 68], [-125, 70], [-140, 70], [-155, 71], [-165, 68]],
  // South America
  [[-79, 9], [-77, 4], [-80, -3], [-81, -6], [-77, -12], [-72, -18], [-70, -23], [-70, -30], [-72, -37], [-73, -44], [-74, -50], [-70, -54], [-66, -55], [-68, -50], [-65, -45], [-62, -41], [-58, -35], [-52, -32], [-48, -28], [-41, -23], [-39, -17], [-35, -9], [-35, -6], [-40, -3], [-44, -2], [-50, 0], [-52, 4], [-55, 6], [-60, 8], [-62, 10], [-68, 11], [-72, 12], [-76, 10]],
  // Africa
  [[-17, 15], [-16, 20], [-15, 27], [-10, 31], [-6, 35], [0, 36], [10, 37], [11, 34], [20, 32], [30, 31], [32, 31], [34, 28], [35, 23], [37, 18], [39, 15], [43, 12], [48, 11], [51, 12], [48, 10], [44, 5], [41, 0], [40, -5], [40, -10], [38, -15], [36, -20], [33, -26], [28, -33], [20, -35], [17, -32], [15, -27], [13, -18], [12, -12], [13, -6], [9, -1], [9, 4], [4, 6], [-8, 5], [-13, 8], [-17, 12]],
  // Eurasia
  [[-10, 36], [-9, 43], [-2, 44], [-1, 46], [-4, 48], [-1, 50], [2, 51], [5, 53], [8, 57], [10, 59], [5, 60], [5, 62], [12, 65], [18, 69], [25, 71], [30, 70], [40, 68], [50, 69], [60, 69], [70, 72], [80, 73], [90, 75], [100, 77], [110, 74], [120, 73], [130, 72], [140, 72], [150, 70], [158, 66], [162, 60], [158, 52], [142, 50], [140, 40], [135, 35], [130, 33], [127, 35], [122, 38], [120, 32], [115, 25], [110, 20], [108, 12], [105, 9], [100, 8], [98, 12], [95, 16], [92, 21], [89, 22], [86, 20], [82, 17], [80, 13], [77, 8], [75, 12], [72, 20], [68, 23], [64, 25], [60, 25], [57, 26], [54, 26], [52, 28], [50, 29], [48, 30], [50, 24], [52, 20], [55, 17], [58, 15], [55, 12], [52, 14], [48, 14], [44, 13], [43, 12], [40, 15], [39, 21], [38, 24], [35, 28], [34, 31], [33, 35], [30, 36], [27, 37], [23, 36], [22, 39], [19, 42], [15, 44], [12, 44], [8, 44], [3, 42], [0, 40], [-2, 37], [-6, 36], [-9, 35]],
  // Australia
  [[114, -22], [113, -26], [115, -33], [118, -35], [124, -33], [129, -32], [132, -32], [135, -35], [138, -35], [140, -38], [145, -38], [150, -37], [153, -32], [153, -27], [151, -24], [146, -19], [142, -15], [142, -11], [137, -12], [135, -15], [132, -12], [130, -13], [126, -14], [122, -17], [118, -20]],
  // Greenland
  [[-58, 64], [-55, 70], [-50, 74], [-40, 76], [-30, 76], [-25, 72], [-32, 68], [-40, 64], [-50, 60], [-55, 60]],
  // Britain
  [[-5, 50], [-3, 53], [-5, 56], [-3, 58], [-1, 57], [0, 53], [1, 51]],
  // Japan
  [[130, 31], [132, 33], [135, 34], [137, 35], [139, 36], [140, 38], [141, 40], [142, 42], [140, 44], [138, 42], [136, 40], [134, 38], [131, 34]],
  // New Zealand
  [[167, -45], [170, -42], [173, -40], [175, -38], [177, -38], [174, -41], [172, -43], [168, -46]],
];

const LON0 = (12 * Math.PI) / 180;
const LAT0 = (24 * Math.PI) / 180;

function project3(lon: number, lat: number): [number, number, number] {
  const la = (lat * Math.PI) / 180;
  const d = (lon * Math.PI) / 180 - LON0;
  const x = Math.cos(la) * Math.sin(d);
  const y = Math.cos(LAT0) * Math.sin(la) - Math.sin(LAT0) * Math.cos(la) * Math.cos(d);
  const z = Math.sin(LAT0) * Math.sin(la) + Math.cos(LAT0) * Math.cos(la) * Math.cos(d);
  return [x, y, z];
}

function clipZ(poly: [number, number, number][], eps: number): [number, number, number][] {
  const res: [number, number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const za = a[2] - eps;
    const zb = b[2] - eps;
    if (za >= 0 && zb >= 0) {
      res.push(b);
    } else if (za >= 0 && zb < 0) {
      const t = za / (za - zb);
      res.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    } else if (za < 0 && zb >= 0) {
      const t = za / (za - zb);
      res.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      res.push(b);
    }
  }
  return res;
}

function drawGlobe(cx: number, cy: number, R: number): void {
  fillDisc(cx, cy, R, OCEAN);
  const clip: Clip = { cx, cy, r: R };
  for (const poly of CONTINENTS) {
    const pts3 = poly.map(([lo, la]) => project3(lo, la));
    const kept = clipZ(pts3, 0.03);
    if (kept.length < 3) continue;
    const pts2: [number, number][] = kept.map(([x, y]) => [cx + R * x, cy - R * y]);
    fillPoly(pts2, LAND, clip);
    // thin dark outline, only where the whole segment lies inside the disc
    for (let i = 0; i < pts2.length; i++) {
      const [x1, y1] = pts2[i];
      const [x2, y2] = pts2[(i + 1) % pts2.length];
      const d1 = Math.hypot(x1 - cx, y1 - cy);
      const d2 = Math.hypot(x2 - cx, y2 - cy);
      if (d1 <= R + 1 && d2 <= R + 1) thickLine(x1, y1, x2, y2, 1.5, LAND_DARK);
    }
  }
  // polar cap: white circular segment at the top of the disc
  const capY = cy - 0.72 * R;
  for (let y = Math.ceil(cy - R); y <= Math.floor(capY); y++) {
    const dy = y - cy;
    const dx = Math.sqrt(Math.max(0, R * R - dy * dy));
    fillRect(Math.ceil(cx - dx), y, Math.floor(2 * dx), 1, CAP);
  }
  // one small red crack in the ocean, south-east of centre (climate stress)
  polyline(
    [
      [cx + 0.38 * R, cy + 0.3 * R],
      [cx + 0.46 * R, cy + 0.36 * R],
      [cx + 0.4 * R, cy + 0.44 * R],
      [cx + 0.5 * R, cy + 0.5 * R],
    ],
    3,
    RED,
  );
  // graticule: meridians and parallels, thin teal lines on the visible face
  for (let lam = -180; lam < 180; lam += 30) {
    let prev: [number, number] | null = null;
    for (let phi = -75; phi <= 75; phi += 3) {
      const p = project3(lam, phi);
      if (p[2] > 0.03) {
        const s: [number, number] = [cx + R * p[0], cy - R * p[1]];
        if (prev) thickLine(prev[0], prev[1], s[0], s[1], 1.2, GRAT);
        prev = s;
      } else {
        prev = null;
      }
    }
  }
  for (const phi of [-60, -30, 0, 30, 60]) {
    let prev: [number, number] | null = null;
    for (let lam = -180; lam <= 180; lam += 3) {
      const p = project3(lam, phi);
      if (p[2] > 0.03) {
        const s: [number, number] = [cx + R * p[0], cy - R * p[1]];
        if (prev) thickLine(prev[0], prev[1], s[0], s[1], 1.2, GRAT);
        prev = s;
      } else {
        prev = null;
      }
    }
  }
  // outline
  const steps = 360;
  let prevX = cx + R;
  let prevY = cy;
  for (let i = 1; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const sx = cx + R * Math.cos(a);
    const sy = cy + R * Math.sin(a);
    thickLine(prevX, prevY, sx, sy, 3, INK);
    prevX = sx;
    prevY = sy;
  }
}

// ------------------------------------------------------- secondary panels ---
// Each panel is a small scene in a 304x78 box. All coordinates are local.

function drawBahrain(x0: number, y0: number, w: number): void {
  fillRect(x0, y0, w, 78, [215, 229, 232]);
  fillRect(x0, y0 + 50, w, 28, SEA);
  // skyline silhouettes on the far shore
  const blocks: [number, number, number, number][] = [
    [10, 32, 26, 18],
    [42, 24, 18, 26],
    [66, 36, 30, 14],
    [102, 28, 16, 22],
    [196, 30, 24, 20],
    [226, 22, 20, 28],
    [252, 34, 28, 16],
  ];
  for (const [bx, by, bw, bh] of blocks) fillRect(x0 + bx, y0 + by, bw, bh, DARK);
  fillRect(x0 + 234, y0 + 14, 2, 8, DARK); // antenna
  // ONE red dashed arc across the sky: a missile path, nothing else
  const ax = x0 + 152;
  const ay = y0 + 50;
  const rx = 132;
  const ry = 40;
  for (let t = 0; t < Math.PI; t += 0.02) {
    if (t % 0.3 < 0.2) {
      const px1 = ax + rx * Math.cos(t);
      const py1 = ay - ry * Math.sin(t);
      const px2 = ax + rx * Math.cos(t + 0.02);
      const py2 = ay - ry * Math.sin(t + 0.02);
      thickLine(px1, py1, px2, py2, 3, RED);
    }
  }
  // burst at the top of the arc
  const sx = ax;
  const sy = ay - ry;
  thickLine(sx - 10, sy, sx + 10, sy, 4, ORANGE);
  thickLine(sx, sy - 9, sx, sy + 9, 4, ORANGE);
  fillDisc(sx, sy, 4, RED);
}

function drawCikande(x0: number, y0: number, w: number): void {
  fillRect(x0, y0, w, 78, [233, 226, 207]);
  fillRect(x0, y0 + 62, w, 16, [203, 184, 148]);
  // factory hall with a sawtooth roof
  fillPoly(
    [
      [x0 + 18, y0 + 62],
      [x0 + 18, y0 + 30],
      [x0 + 48, y0 + 12],
      [x0 + 78, y0 + 30],
      [x0 + 108, y0 + 12],
      [x0 + 138, y0 + 30],
      [x0 + 168, y0 + 12],
      [x0 + 198, y0 + 30],
      [x0 + 218, y0 + 30],
      [x0 + 218, y0 + 62],
    ],
    DARK,
  );
  // chimney with smoke
  fillRect(x0 + 232, y0 + 16, 18, 46, DARK);
  fillDisc(x0 + 241, y0 + 10, 6, SMOKE);
  fillDisc(x0 + 252, y0 + 6, 5, SMOKE);
  // flames licking from the roof peaks
  fillPoly([[x0 + 39, y0 + 16], [x0 + 48, y0 + 1], [x0 + 57, y0 + 16]], ORANGE);
  fillPoly([[x0 + 130, y0 + 16], [x0 + 138, y0 + 3], [x0 + 146, y0 + 16]], AMBER);
  fillPoly([[x0 + 161, y0 + 16], [x0 + 168, y0 + 7], [x0 + 175, y0 + 16]], ORANGE);
  // small pale windows
  for (const wx of [34, 64, 94, 124, 154, 184]) {
    fillRect(x0 + wx, y0 + 40, 9, 11, [232, 224, 200]);
  }
}

function drawKyiv(x0: number, y0: number, w: number): void {
  fillRect(x0, y0, w, 78, [221, 229, 232]);
  fillRect(x0, y0 + 62, w, 16, [185, 179, 164]);
  // five-storey flat block
  fillRect(x0 + 24, y0 + 8, 150, 54, DARK2);
  // windows: some lit, most dark
  const lit = new Set(["0,0", "0,2", "1,1", "2,0", "2,3", "3,2"]);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = x0 + 36 + col * 30;
      const wy = y0 + 16 + row * 11;
      fillRect(wx, wy, 12, 8, lit.has(`${row},${col}`) ? WIN_LIT : WIN_DARK);
    }
  }
  // collapsed fragment on the right, leaning out
  fillPoly(
    [
      [x0 + 186, y0 + 20],
      [x0 + 212, y0 + 14],
      [x0 + 220, y0 + 62],
      [x0 + 186, y0 + 62],
    ],
    DARK3,
  );
  // rubble at the foot of the fragment, one small flame still burning
  fillPoly([[x0 + 182, y0 + 62], [x0 + 196, y0 + 48], [x0 + 210, y0 + 62]], RUBBLE);
  fillPoly([[x0 + 206, y0 + 62], [x0 + 218, y0 + 52], [x0 + 230, y0 + 62]], RUBBLE);
  fillPoly([[x0 + 196, y0 + 50], [x0 + 202, y0 + 40], [x0 + 208, y0 + 50]], ORANGE);
  // smoke above the damage
  fillDisc(x0 + 200, y0 + 8, 7, SMOKE);
  fillDisc(x0 + 210, y0 + 2, 5, SMOKE);
  // chunky rescue ladder leaning to a second-floor window
  const ax = x0 + 60;
  const ay = y0 + 64;
  const bx = x0 + 102;
  const by = y0 + 31;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * 12;
  const ny = (dx / len) * 12;
  thickLine(ax, ay, bx, by, 3.5, LADDER);
  thickLine(ax + nx, ay + ny, bx + nx, by + ny, 3.5, LADDER);
  for (const t of [0.25, 0.5, 0.75]) {
    const rx1 = ax + dx * t;
    const ry1 = ay + dy * t;
    thickLine(rx1, ry1, rx1 + nx, ry1 + ny, 3, LADDER);
  }
  // small first-aid sign, top right
  fillRect(x0 + 272, y0 + 6, 18, 18, WHITE);
  fillRect(x0 + 279, y0 + 9, 4, 12, RED);
  fillRect(x0 + 274, y0 + 12, 14, 4, RED);
}

// ------------------------------------------------------------------- png ----
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ main ----
const DOSSIER = JSON.stringify(
  {
    date: "2026-11-22",
    title: "THE WORLD — Sunday, 22 November 2026",
    lead: {
      kicker: "CLIMATE · ANTALYA, TURKEY",
      headline: "COP31 TALKS SET FOR NO DEAL",
      lines: [
        "Antalya summit in second day of overtime",
        "President: no new draft; fossil-fuel wording dropped",
        "EU: 'good deal or no deal'; $120bn target dropped",
      ],
      sources: ["Reuters 21-22 Nov 2026"],
    },
    secondary: [
      {
        place: "BAHRAIN",
        headline: "IRAN STRIKES US BASES",
        lines: ["Tehran claims", "Patriot radars hit"],
        sources: ["Al Jazeera via ANI", "Xinhua"],
      },
      {
        place: "CIKANDE",
        headline: "FACTORY FIRE IN CIKANDE",
        lines: ["3 dead, 36 missing", "Search goes on"],
        sources: ["AP", "Reuters"],
      },
      {
        place: "KYIV REGION",
        headline: "DRONE HITS KYIV FLAT",
        lines: ["14 still missing", "9 evacuated"],
        sources: ["Reuters"],
      },
    ],
    briefs: [
      "NIGERIA: BOAT TO FUNERAL CAPSIZES; 24 DEAD",
      "NEPAL: PM BALENDRA SHAH ARRIVES IN INDIA",
      "CRICKET: INDIA 720/9, LEAD NEW ZEALAND BY 352",
      "F1: VERSTAPPEN WINS LAS VEGAS GRAND PRIX",
      "SOUTH AFRICA: FLAGS AT HALF-MAST FOR MLAMBO-NGCUKA",
      "NATO TO MEET MONDAY OVER MISSILES IN POLAND",
    ],
    sources: ["Reuters", "AP", "Al Jazeera", "Xinhua", "IANS", "ESPNcricinfo", "SA News", "EU Today"],
    program: "main.ts — Node 22 stdlib only, no network, deterministic",
  },
  null,
  2,
) + "\n";

function main(): void {
  fillRect(0, 0, W, H, PAPER);

  // Masthead
  drawText("THE WORLD", W / 2, 12, 104, INK, { align: "center", bold: true, tracking: 0.6 });
  fillRect(36, 128, 952, 3, INK);
  fillRect(36, 135, 952, 1, INK);
  drawText("SUNDAY, 22 NOVEMBER 2026", 36, 142, 22, INK, { bold: true });
  drawText("IN ONE IMAGE", 988, 142, 22, RED, { align: "right", bold: true });
  fillRect(36, 170, 952, 1, INK);
  drawText("CLIMATE · ANTALYA, TURKEY", 36, 178, 22, RED, { bold: true });

  // Lead illustration: the Earth, with a small red crack
  drawGlobe(512, 264, 70);

  // Lead headline + three factual lines
  drawText("COP31 TALKS", 512, 344, 76, INK, { align: "center", bold: true, tracking: 0.4 });
  drawText("SET FOR NO DEAL", 512, 426, 76, RED, { align: "center", bold: true, tracking: 0.4 });
  drawText("ANTALYA SUMMIT IN SECOND DAY OF OVERTIME", 512, 512, 21, INK, { align: "center", bold: true });
  drawText("PRESIDENT: NO NEW DRAFT; FOSSIL-FUEL WORDING DROPPED", 512, 537, 21, INK, { align: "center", bold: true });
  drawText("EU: 'GOOD DEAL OR NO DEAL'; $120BN TARGET DROPPED", 512, 562, 21, INK, { align: "center", bold: true });

  fillRect(36, 592, 952, 2, INK);

  // Three secondary stories, one shared headline scale
  const px = [36, 360, 684];
  drawBahrain(px[0], 602, 304);
  drawCikande(px[1], 602, 304);
  drawKyiv(px[2], 602, 304);
  const kickers = ["BAHRAIN", "CIKANDE", "KYIV REGION"];
  const heads: [string, string][] = [
    ["IRAN STRIKES", "US BASES"],
    ["FACTORY FIRE", "IN CIKANDE"],
    ["DRONE HITS", "KYIV FLAT"],
  ];
  const subs: [string, string][] = [
    ["TEHRAN CLAIMS", "PATRIOT RADARS HIT"],
    ["3 DEAD, 36 MISSING", "SEARCH GOES ON"],
    ["14 STILL MISSING", "9 EVACUATED"],
  ];
  for (let i = 0; i < 3; i++) {
    drawText(kickers[i], px[i], 688, 18, RED, { bold: true });
    drawText(heads[i][0], px[i], 712, 32, INK, { bold: true });
    drawText(heads[i][1], px[i], 746, 32, INK, { bold: true });
    drawText(subs[i][0], px[i], 782, 17, INK, { bold: true });
    drawText(subs[i][1], px[i], 803, 17, INK, { bold: true });
  }

  fillRect(36, 826, 952, 2, INK);

  // Footer: IN BRIEF, six one-line briefs, source line
  drawText("IN BRIEF", 36, 834, 20, RED, { bold: true });
  drawText("SOURCES: REUTERS, AP, AL JAZEERA, IANS, SA NEWS", 988, 838, 15, GRAY, { align: "right" });
  const briefs = [
    "NIGERIA: BOAT TO FUNERAL CAPSIZES; 24 DEAD",
    "NEPAL: PM BALENDRA SHAH ARRIVES IN INDIA",
    "CRICKET: INDIA 720/9, LEAD NEW ZEALAND BY 352",
    "F1: VERSTAPPEN WINS LAS VEGAS GRAND PRIX",
    "SOUTH AFRICA: FLAGS AT HALF-MAST FOR MLAMBO-NGCUKA",
    "NATO TO MEET MONDAY OVER MISSILES IN POLAND",
  ];
  briefs.forEach((b, i) => {
    const y = 862 + i * 22;
    fillRect(36, y + 6, 7, 7, RED);
    drawText(b, 54, y, 17, INK, { bold: true });
  });

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), encodePNG());
  writeFileSync(join(outDir, "dossier.json"), DOSSIER);
}

main();
