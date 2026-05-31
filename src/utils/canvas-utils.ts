import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ASSETS = existsSync(join(process.cwd(), "src", "assets"))
  ? join(process.cwd(), "src", "assets")
  : join(process.cwd(), "assets");

const FONTS_DIR = join(ASSETS, "fonts");
export const ASSETS_DIR = ASSETS;

export const BG_BASE = "#0a0a0f";
export const BG_ELEVATED = "#1e1e2e";
export const BG_OVERLAY = "#2a2a3a";
export const TEXT_PRIMARY = "#e8e8f0";
export const TEXT_SECONDARY = "#8888a0";
export const TEXT_TERTIARY = "#5a5a72";
export const SUCCESS = "#22c55e";
const ERROR = "#ef4444";

export const CATEGORY_HEX: Record<string, string> = {
  overall: "#a855f7",
  true_acc: "#22c55e",
  standard_acc: "#3b82f6",
  tech_acc: "#ef4444",
  low_mid: "#eab308",
};

export const CATEGORY_LABEL: Record<string, string> = {
  overall: "Overall",
  true_acc: "True Acc",
  standard_acc: "Standard Acc",
  tech_acc: "Tech Acc",
  low_mid: "Low Mid",
};

export const SANS = '"DM Sans", "Noto Sans JP", system-ui, -apple-system, sans-serif';
export const MONO = '"Poppins", "Noto Sans JP", system-ui, sans-serif';

let fontsRegistered = false;

export function registerFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;
  const register = (file: string, family: string) => {
    const path = join(FONTS_DIR, file);
    if (existsSync(path)) GlobalFonts.registerFromPath(path, family);
  };
  register("DMSans-Regular.ttf", "DM Sans");
  register("DMSans-Medium.ttf", "DM Sans");
  register("DMSans-Bold.ttf", "DM Sans");
  register("Poppins-Regular.ttf", "Poppins");
  register("Poppins-Medium.ttf", "Poppins");
  register("Poppins-Bold.ttf", "Poppins");
  register("NotoSansJP.ttf", "Noto Sans JP");
}

export type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

export function drawRoundedRect(
  ctx: Ctx, x: number, y: number, w: number, h: number, r: number,
  fill: string, stroke?: string
): void {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export async function fetchImage(url: string): Promise<ReturnType<typeof loadImage>> {
  const res = await fetch(url);
  return loadImage(Buffer.from(await res.arrayBuffer()));
}

export function numberFmt(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ageInDays(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000;
}

export function relativeTime(dateStr: string): string {
  const days = ageInDays(dateStr);
  if (days < 0.0007) return "just now";
  const mins = Math.floor(days * 1440);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(days * 24);
  if (hrs < 24) return `${hrs}h ago`;
  const d = Math.floor(days);
  if (d < 7) return `${d}d ago`;
  const weeks = Math.floor(d / 7);
  if (d < 30) return `${weeks}w ago`;
  const months = Math.floor(d / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function ageColor(dateStr: string): string {
  const days = ageInDays(dateStr);
  if (days < 7) return TEXT_PRIMARY;
  if (days >= 365) return TEXT_TERTIARY;
  const pr = [0xe8, 0xe8, 0xf0];
  const sc = [0x88, 0x88, 0xa0];
  const tr = [0x5a, 0x5a, 0x72];
  let t: number;
  let from: number[];
  let to: number[];
  if (days < 30) {
    t = (days - 7) / 23;
    from = pr;
    to = sc;
  } else {
    t = Math.min((days - 30) / 335, 1);
    from = sc;
    to = tr;
  }
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function trendStr(
  value: number | null | undefined,
  invert = false
): { text: string; color: string } {
  if (value == null || Math.abs(value) < 0.005) return { text: "", color: TEXT_TERTIARY };
  const positive = invert ? value < 0 : value > 0;
  const arrow = positive ? "\u25B2" : "\u25BC";
  const abs = Math.abs(value);
  const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
  return {
    text: `${arrow} ${formatted}`,
    color: positive ? SUCCESS : ERROR,
  };
}

export function drawFlagIcon(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  color: string,
  glow: { color: string; blur: number } | null = null
): void {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur;
  }
  const s = size / 24;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2.2 * s;

  ctx.beginPath();
  ctx.moveTo(4 * s, 15 * s);
  ctx.bezierCurveTo(4 * s, 15 * s, 5 * s, 14 * s, 8 * s, 14 * s);
  ctx.bezierCurveTo(11 * s, 14 * s, 13 * s, 16 * s, 16 * s, 16 * s);
  ctx.bezierCurveTo(19 * s, 16 * s, 20 * s, 15 * s, 20 * s, 15 * s);
  ctx.lineTo(20 * s, 3 * s);
  ctx.bezierCurveTo(20 * s, 3 * s, 19 * s, 4 * s, 16 * s, 4 * s);
  ctx.bezierCurveTo(13 * s, 4 * s, 11 * s, 2 * s, 8 * s, 2 * s);
  ctx.bezierCurveTo(5 * s, 2 * s, 4 * s, 3 * s, 4 * s, 3 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(4 * s, 22 * s);
  ctx.lineTo(4 * s, 15 * s);
  ctx.stroke();

  ctx.restore();
}

export function drawTrophyIcon(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  color: string,
  glow: { color: string; blur: number } | null = null
): void {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur;
  }
  const s = size / 24;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 2 * s;

  ctx.beginPath();
  ctx.moveTo(6 * s, 2 * s);
  ctx.lineTo(18 * s, 2 * s);
  ctx.lineTo(18 * s, 9 * s);
  ctx.bezierCurveTo(18 * s, 12.3 * s, 15.3 * s, 15 * s, 12 * s, 15 * s);
  ctx.bezierCurveTo(8.7 * s, 15 * s, 6 * s, 12.3 * s, 6 * s, 9 * s);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(6 * s, 4 * s);
  ctx.lineTo(4.5 * s, 4 * s);
  ctx.bezierCurveTo(3.1 * s, 4 * s, 2 * s, 5.1 * s, 2 * s, 6.5 * s);
  ctx.bezierCurveTo(2 * s, 7.9 * s, 3.1 * s, 9 * s, 4.5 * s, 9 * s);
  ctx.lineTo(6 * s, 9 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(18 * s, 4 * s);
  ctx.lineTo(19.5 * s, 4 * s);
  ctx.bezierCurveTo(20.9 * s, 4 * s, 22 * s, 5.1 * s, 22 * s, 6.5 * s);
  ctx.bezierCurveTo(22 * s, 7.9 * s, 20.9 * s, 9 * s, 19.5 * s, 9 * s);
  ctx.lineTo(18 * s, 9 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(10 * s, 14.66 * s);
  ctx.lineTo(10 * s, 17 * s);
  ctx.bezierCurveTo(10 * s, 17.55 * s, 9.53 * s, 17.98 * s, 9.03 * s, 18.21 * s);
  ctx.bezierCurveTo(7.85 * s, 18.75 * s, 7 * s, 20.24 * s, 7 * s, 22 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(14 * s, 14.66 * s);
  ctx.lineTo(14 * s, 17 * s);
  ctx.bezierCurveTo(14 * s, 17.55 * s, 14.47 * s, 17.98 * s, 14.97 * s, 18.21 * s);
  ctx.bezierCurveTo(16.15 * s, 18.75 * s, 17 * s, 20.24 * s, 17 * s, 22 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(4 * s, 22 * s);
  ctx.lineTo(20 * s, 22 * s);
  ctx.stroke();

  ctx.restore();
}

export function drawStackIcon(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  color: string,
  glow: { color: string; blur: number } | null = null
): void {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur;
  }
  const s = size / 24;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.2 * s;

  const plateW = 17 * s;
  const plateH = 3.6 * s;
  const radius = 1.6 * s;
  const xStart = 3.5 * s;
  const ys = [4.5 * s, 10.2 * s, 15.9 * s];

  for (let i = 0; i < ys.length; i++) {
    ctx.globalAlpha = i === 0 ? 0.6 : i === 1 ? 0.82 : 1;
    ctx.beginPath();
    ctx.roundRect(xStart, ys[i], plateW, plateH, radius);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(xStart + 0.5 * s, ys[2] + plateH + 2 * s);
  ctx.lineTo(xStart + plateW - 0.5 * s, ys[2] + plateH + 2 * s);
  ctx.stroke();

  ctx.restore();
}

export function drawTargetIcon(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  color: string,
  glow: { color: string; blur: number } | null = null
): void {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur;
  }
  const s = size / 24;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(12 * s, 12 * s, 10 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.arc(12 * s, 12 * s, 6.5 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(12 * s, 12 * s, 2.6 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function formatDifficulty(diff: string): string {
  const map: Record<string, string> = {
    EASY: "Easy",
    NORMAL: "Normal",
    HARD: "Hard",
    EXPERT: "Expert",
    EXPERT_PLUS: "Expert+",
  };
  return map[diff] ?? diff;
}


