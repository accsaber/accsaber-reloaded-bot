import { Path2D } from "@napi-rs/canvas";
import { BG_SURFACE, mixHex, type ArtPainter, type Ctx } from "./canvas-utils.js";

const TIERS = ["bronze", "silver", "gold", "platinum", "diamond", "apex"] as const;

export type BadgeTier = (typeof TIERS)[number];

interface Frame {
  plate: string;
  rimWidth: number;
  seams?: string;
  studs?: string;
  glyphScale: number;
  glyphDy?: number;
}

const FRAMES: Record<BadgeTier, Frame> = {
  bronze: { plate: "M11 11h78v78H11Z", rimWidth: 5, glyphScale: 0.56 },
  silver: {
    plate: "M91 50a41 41 0 1 1-82 0 41 41 0 1 1 82 0",
    rimWidth: 5.5,
    seams: "M82 50a32 32 0 1 1-64 0 32 32 0 1 1 64 0",
    glyphScale: 0.54,
  },
  gold: {
    plate: "M15 10H85V50C85 74 66 87 50 93C34 87 15 74 15 50Z",
    rimWidth: 6,
    seams: "M24 19H76V50C76 67 62 77 50 83C38 77 24 67 24 50Z",
    glyphScale: 0.52,
    glyphDy: -4,
  },
  platinum: {
    plate: "M50 5 89 27.5V72.5L50 95 11 72.5V27.5Z",
    rimWidth: 6,
    seams: "M50 15.5 80 33V67L50 84.5 20 67V33Z",
    studs: "M23.2 50a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 1 1 6.4 0M83.2 50a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 1 1 6.4 0",
    glyphScale: 0.54,
  },
  diamond: {
    plate: "M30 10H70L90 40 50 92 10 40Z",
    rimWidth: 6,
    seams: "M10 40H90M30 10 38 40 50 92 62 40 70 10",
    glyphScale: 0.44,
    glyphDy: -5,
  },
  apex: {
    plate:
      "M50 3 63.8 16.7 83.2 16.8 83.3 36.2 97 50 83.3 63.8 83.2 83.2 63.8 83.3 50 97 36.2 83.3 16.8 83.2 16.7 63.8 3 50 16.7 36.2 16.8 16.8 36.2 16.7Z",
    rimWidth: 6,
    seams: "M80 50a30 30 0 1 1-60 0 30 30 0 1 1 60 0",
    glyphScale: 0.5,
  },
};

type GlyphMode = "row" | "stack" | "nest" | "growth" | "orbit" | "deck" | "rotate";

interface GlyphSpec {
  mode: GlyphMode;
  unit: string;
  unitFill?: boolean;
  step?: number;
  core?: string;
  orbitRadius?: number;
}

const ROW = 5.8;
const STACK = 4.6;
const DECK = 1.9;

const SPECS: Record<string, GlyphSpec> = {
  AP: { mode: "nest", unit: "M12 3.8 20.2 12 12 20.2 3.8 12Z" },
  ACCURACY: { mode: "nest", unit: "M20 12a8 8 0 1 1-16 0 8 8 0 1 1 16 0" },
  RANK: { mode: "growth", unit: "" },
  STREAK: { mode: "stack", unit: "M8.8 13.6 12 10.4 15.2 13.6", step: STACK },
  SCORE: { mode: "row", unit: "M14.6 12a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 1 1 5.2 0", unitFill: true, step: ROW },
  MAP: { mode: "deck", unit: "M9.6 9.6h4.8v4.8H9.6Z", step: DECK },
  MISTAKE: { mode: "row", unit: "M9.8 9.8l4.4 4.4M14.2 9.8l-4.4 4.4", step: ROW },
  XP: { mode: "rotate", unit: "M12 11.2V5.4" },
  PLAYER: { mode: "orbit", unit: "", core: "M15.7 8.3a3.7 3.7 0 1 1-7.4 0 3.7 3.7 0 0 1 7.4 0", orbitRadius: 6.6 },
  LEVEL: { mode: "growth", unit: "" },
  MODIFIER: { mode: "stack", unit: "M8 12h1.8M13.2 12h2.8M9.8 12a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0", step: STACK },
  CAMPAIGN: { mode: "orbit", unit: "", core: "M14.4 12a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 1 1 4.8 0", orbitRadius: 5.8 },
  MISSION: { mode: "row", unit: "M10 15.4V8.6M10 9h4.4l-1 1.5 1 1.5h-4.4", step: ROW },
  MILESTONE: { mode: "orbit", unit: "", core: "M10.4 13.8V12a1.6 1.6 0 0 1 3.2 0v1.8M9.8 13.8h4.4", orbitRadius: 6.2 },
  ITEM: { mode: "nest", unit: "M12 4.6 19 8.6v6.8L12 19.4 5 15.4V8.6Z" },
  CRATE: { mode: "nest", unit: "M5 5h14v14H5ZM5 9.6h14" },
  MARKET: { mode: "deck", unit: "M9.6 12.4 12.4 9.6h2.6v2.6l-2.8 2.8Z", step: DECK },
  TRADE: { mode: "rotate", unit: "M12 10.8V5.2M10.2 7 12 5.1l1.8 1.9" },
  ESSENCE: { mode: "rotate", unit: "M12 11.2c.4-2.2.9-3.6 0-5.8-.9 2.2-.4 3.6 0 5.8Z", unitFill: true },
  GENERAL: { mode: "nest", unit: "M12 4 19.4 8.2v7.6L12 20 4.6 15.8V8.2Z" },
};

const STAR = "M18.6 2.6 19.5 4.8 21.8 5 20 6.5 20.6 8.8 18.6 7.5 16.6 8.8 17.2 6.5 15.4 5 17.7 4.8Z";
const STAR_PLACE = "translate(12 17.9) scale(0.62) translate(-18.6 -6)";
const STAR_SHRINK = "translate(12 9.4) scale(0.74) translate(-12 -12)";
const NEST_STEP = 0.32;
const COUNT_SCALE: Record<number, number> = { 1: 1.45, 2: 1.15, 3: 1 };

interface GlyphPart {
  d: string;
  fill: boolean;
  transform?: string;
  scale: number;
}

function offsets(count: number, step: number): number[] {
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * step);
}

function dot(cx: number, cy: number, r: number): string {
  const d = (2 * r).toFixed(2);
  return `M${(cx + r).toFixed(2)} ${cy.toFixed(2)}a${r} ${r} 0 1 1 -${d} 0a${r} ${r} 0 1 1 ${d} 0`;
}

function growthBars(count: number): GlyphPart[] {
  const width = 2;
  const gap = 1.7;
  const total = count * width + (count - 1) * gap;
  return Array.from({ length: count }, (_, i) => {
    const x = 12 - total / 2 + width / 2 + i * (width + gap);
    const height = 3.4 + (4.2 * i) / Math.max(count - 1, 1);
    return { d: `M${x.toFixed(2)} 15.2V${(15.2 - height).toFixed(2)}`, fill: false, scale: 1 };
  });
}

function orbitParts(spec: GlyphSpec, count: number): GlyphPart[] {
  const radius = spec.orbitRadius ?? 6;
  const dots = Array.from({ length: count }, (_, i) => {
    const angle = (-90 + (360 / count) * i) * (Math.PI / 180);
    return { d: dot(12 + radius * Math.cos(angle), 12 + radius * Math.sin(angle), 1.2), fill: true, scale: 1 };
  });
  return [{ d: spec.core ?? "", fill: false, scale: 1 }, ...dots];
}

function repeatParts(spec: GlyphSpec, count: number): GlyphPart[] {
  const spread = COUNT_SCALE[count] ?? 1;
  return offsets(count, spec.step ?? ROW).map((value) => {
    const shift = (value * spread).toFixed(2);
    return {
      d: spec.unit,
      fill: !!spec.unitFill,
      transform: `translate(${spec.mode === "stack" ? `0 ${shift}` : `${shift} 0`}) translate(12 12) scale(${spread}) translate(-12 -12)`,
      scale: spread,
    };
  });
}

function deckParts(spec: GlyphSpec, count: number): GlyphPart[] {
  return offsets(count, spec.step ?? DECK).map((value) => ({
    d: spec.unit,
    fill: !!spec.unitFill,
    transform: `translate(${value.toFixed(2)} ${(-value).toFixed(2)})`,
    scale: 1,
  }));
}

function rotateParts(spec: GlyphSpec, count: number): GlyphPart[] {
  return Array.from({ length: count }, (_, i) => ({
    d: spec.unit,
    fill: !!spec.unitFill,
    transform: i === 0 ? undefined : `rotate(${((360 / count) * i).toFixed(1)} 12 12)`,
    scale: 1,
  }));
}

function nestParts(spec: GlyphSpec, depth: number, solidCore: boolean): GlyphPart[] {
  const rings = Array.from({ length: depth }, (_, i) => {
    const factor = 1 - i * NEST_STEP;
    return {
      d: spec.unit,
      fill: false,
      transform: i === 0 ? undefined : `translate(12 12) scale(${factor.toFixed(3)}) translate(-12 -12)`,
      scale: factor,
    };
  });
  if (!solidCore) return rings;
  const inner = 1 - (depth - 1) * NEST_STEP;
  return [...rings, { d: dot(12, 12, Math.max(inner * 2.4, 1)), fill: true, scale: 1 }];
}

function modeParts(spec: GlyphSpec, count: number): GlyphPart[] {
  if (spec.mode === "growth") return growthBars(count);
  if (spec.mode === "orbit") return orbitParts(spec, count);
  if (spec.mode === "deck") return deckParts(spec, count);
  if (spec.mode === "rotate") return rotateParts(spec, count);
  return repeatParts(spec, count);
}

function glyphParts(group: string | null | undefined, tier: BadgeTier): GlyphPart[] {
  const spec = SPECS[group?.toUpperCase() ?? ""] ?? SPECS.GENERAL;
  const index = TIERS.indexOf(tier);
  if (spec.mode === "nest") return nestParts(spec, (index % 3) + 1, index >= 3);

  const star = index >= 3;
  const out = modeParts(spec, (index % 3) + 1).map((part) => ({
    ...part,
    transform: star ? `${STAR_SHRINK} ${part.transform ?? ""}` : part.transform,
    scale: part.scale * (star ? 0.74 : 1),
  }));
  if (star) out.push({ d: STAR, fill: true, transform: STAR_PLACE, scale: 0.62 });
  return out;
}

function applyTransform(ctx: Ctx, transform: string | undefined): void {
  for (const [, op, args] of (transform ?? "").matchAll(/(translate|scale|rotate)\(([^)]*)\)/g)) {
    const n = args.trim().split(/[\s,]+/).map(Number);
    if (op === "translate") ctx.translate(n[0], n[1] ?? 0);
    else if (op === "scale") ctx.scale(n[0], n[1] ?? n[0]);
    else {
      ctx.translate(n[1] ?? 0, n[2] ?? 0);
      ctx.rotate((n[0] * Math.PI) / 180);
      ctx.translate(-(n[1] ?? 0), -(n[2] ?? 0));
    }
  }
}

export function resolveBadgeTier(raw: string | null | undefined): BadgeTier {
  const key = raw?.toLowerCase() as BadgeTier;
  return TIERS.includes(key) ? key : "bronze";
}

export function badgePainter(tier: BadgeTier, group: string | null | undefined, color: string): ArtPainter {
  const plate = mixHex(color, BG_SURFACE, 0.16);
  return (ctx, x, y, size) => drawMilestoneBadge(ctx, x, y, size, tier, group, color, plate);
}

function drawMilestoneBadge(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  tier: BadgeTier,
  group: string | null | undefined,
  color: string,
  plate: string
): void {
  const frame = FRAMES[tier];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const platePath = new Path2D(frame.plate);
  ctx.fillStyle = plate;
  ctx.fill(platePath);
  ctx.lineWidth = frame.rimWidth;
  ctx.stroke(platePath);

  ctx.fillStyle = color;
  if (frame.seams) {
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.stroke(new Path2D(frame.seams));
  }
  if (frame.studs) {
    ctx.globalAlpha = 0.7;
    ctx.fill(new Path2D(frame.studs));
  }
  ctx.globalAlpha = 1;

  const box = 100 * frame.glyphScale;
  ctx.translate((100 - box) / 2, (100 - box) / 2 + (frame.glyphDy ?? 0));
  ctx.scale(box / 24, box / 24);
  for (const part of glyphParts(group, tier)) {
    if (!part.d) continue;
    const path = new Path2D(part.d);
    ctx.save();
    applyTransform(ctx, part.transform);
    ctx.lineWidth = (part.fill ? 0.5 : 1.25) / part.scale;
    if (part.fill) ctx.fill(path);
    ctx.stroke(path);
    ctx.restore();
  }
  ctx.restore();
}
