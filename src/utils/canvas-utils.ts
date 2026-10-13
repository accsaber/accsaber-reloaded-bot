import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getTierForLevel } from "./roles.js";

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

function registerFonts(): void {
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

registerFonts();

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

export function drawCrateIcon(
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
  ctx.lineWidth = 1.9 * s;

  ctx.beginPath();
  ctx.roundRect(3.5 * s, 8 * s, 17 * s, 13 * s, 2 * s);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(2 * s, 4 * s, 20 * s, 5 * s, 1.6 * s);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(12 * s, 9.5 * s);
  ctx.lineTo(12 * s, 21 * s);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(4.5 * s, 15 * s);
  ctx.lineTo(19.5 * s, 15 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

export function drawSparkleIcon(
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

  const star = (cx: number, cy: number, r: number, waist: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + waist, cy - waist, cx + r, cy);
    ctx.quadraticCurveTo(cx + waist, cy + waist, cx, cy + r);
    ctx.quadraticCurveTo(cx - waist, cy + waist, cx - r, cy);
    ctx.quadraticCurveTo(cx - waist, cy - waist, cx, cy - r);
    ctx.closePath();
    ctx.fill();
  };

  star(11 * s, 11 * s, 9 * s, 1.6 * s);
  ctx.globalAlpha = 0.75;
  star(19 * s, 18.5 * s, 4.5 * s, 0.8 * s);
  ctx.globalAlpha = 1;

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



export type Img = Awaited<ReturnType<typeof loadImage>>;

export async function loadOptionalImage(url: string | null | undefined): Promise<Img | null> {
  if (!url) return null;
  try {
    return await fetchImage(url);
  } catch {
    return null;
  }
}

export function truncate(ctx: Ctx, text: string, maxWidth: number): string {
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 6) {
    out = out.slice(0, -4) + "...";
  }
  return out;
}

export function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines) {
    const consumed = lines.flatMap((l) => l.split(/\s+/)).length;
    let last = lines[maxLines - 1];
    if (words.length > consumed) {
      while (ctx.measureText(last + "...").width > maxWidth && last.length > 4) {
        last = last.slice(0, -2);
      }
      last = last + "...";
    }
    lines[maxLines - 1] = last;
  }

  return lines;
}

export function drawRightChip(
  ctx: Ctx,
  rightX: number,
  y: number,
  label: string,
  color: string
): number {
  ctx.font = `700 10px ${MONO}`;
  let text = label;
  while (ctx.measureText(text).width > 180 && text.length > 6) {
    text = text.slice(0, -4) + "...";
  }
  const w = ctx.measureText(text).width + 16;
  const x = rightX - w;
  drawRoundedRect(ctx, x, y, w, 18, 4, hexWithAlpha(color, 0.14));
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 8, y + 9);
  ctx.textBaseline = "top";
  return x;
}

export function drawBigValue(ctx: Ctx, x: number, y: number, value: string, unit: string, unitColor: string): void {
  ctx.font = `700 28px ${MONO}`;
  const w = ctx.measureText(value).width;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(value, x, y);
  ctx.font = `700 11px ${MONO}`;
  ctx.fillStyle = unitColor;
  ctx.fillText(unit, x + w + 6, y + 14);
}

export const FEED_W = 680;
const CARD_X = 18;
const CARD_Y = 14;
const CARD_W = FEED_W - CARD_X * 2;
const CARD_PAD = 22;
const AVATAR = 50;

export const FEED_LEFT = CARD_X + CARD_PAD + 4;
export const FEED_RIGHT = CARD_X + CARD_W - CARD_PAD;
export const FEED_TOP = CARD_Y + CARD_PAD - 2;
export const FEED_BODY_TOP = FEED_TOP + AVATAR + 18;

export interface FeedShell {
  user: { name: string; country?: string | null; avatarUrl?: string | null };
  level?: number;
  title: string;
  titleColor: string;
  subtitle?: string;
  chips?: { label: string; color: string }[];
  wash: string;
  washAlpha?: number;
  backdrop?: Img | null;
}

export async function openFeedCard(
  contentH: number,
  shell: FeedShell
): Promise<{ ctx: Ctx; finish: () => Promise<Buffer> }> {
  const H = CARD_Y * 2 + contentH;
  const canvas = createCanvas(FEED_W, H);
  const ctx = canvas.getContext("2d");
  const avatar = await loadOptionalImage(shell.user.avatarUrl);

  ctx.fillStyle = BG_BASE;
  ctx.fillRect(0, 0, FEED_W, H);
  drawRoundedRect(ctx, CARD_X, CARD_Y, CARD_W, contentH, 12, "#13131c", BG_OVERLAY);

  ctx.save();
  roundRect(ctx, CARD_X, CARD_Y, CARD_W, contentH, 12);
  ctx.clip();
  if (shell.backdrop) {
    const img = shell.backdrop;
    const bandW = 300;
    const bandX = CARD_X + CARD_W - bandW;
    const scale = Math.max(bandW / img.width, contentH / img.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bandX, CARD_Y, bandW, contentH);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.drawImage(
      img,
      bandX + (bandW - img.width * scale) / 2,
      CARD_Y + (contentH - img.height * scale) / 2,
      img.width * scale,
      img.height * scale
    );
    ctx.restore();
    const fade = ctx.createLinearGradient(bandX, 0, bandX + bandW, 0);
    fade.addColorStop(0, "#13131c");
    fade.addColorStop(0.6, hexWithAlpha("#13131c", 0.5));
    fade.addColorStop(1, hexWithAlpha("#13131c", 0.3));
    ctx.fillStyle = fade;
    ctx.fillRect(bandX, CARD_Y, bandW, contentH);
  }
  const wash = ctx.createRadialGradient(CARD_X + CARD_W - 60, CARD_Y + 20, 0, CARD_X + CARD_W - 60, CARD_Y + 20, 420);
  wash.addColorStop(0, hexWithAlpha(shell.wash, shell.washAlpha ?? 0.16));
  wash.addColorStop(1, hexWithAlpha(shell.wash, 0));
  ctx.fillStyle = wash;
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, contentH);
  ctx.restore();

  ctx.textBaseline = "top";
  const y = FEED_TOP;

  let topRightX = FEED_RIGHT;
  for (const chip of shell.chips ?? []) {
    topRightX = drawRightChip(ctx, topRightX, y + 4, chip.label.toUpperCase(), chip.color) - 6;
  }

  const tier = shell.level ? getTierForLevel(shell.level) : undefined;
  const ringColor = tier ? `#${tier.color.toString(16).padStart(6, "0")}` : TEXT_SECONDARY;
  const boxX = FEED_LEFT - 2;
  const boxY = y - 2;
  const box = AVATAR + 4;
  drawRoundedRect(ctx, boxX, boxY, box, box, 10, BG_ELEVATED);
  if (avatar) {
    ctx.save();
    roundRect(ctx, boxX, boxY, box, box, 10);
    ctx.clip();
    ctx.drawImage(avatar, boxX, boxY, box, box);
    ctx.restore();
  }
  roundRect(ctx, boxX, boxY, box, box, 10);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  const nameX = FEED_LEFT + AVATAR + 12;
  ctx.font = `700 17px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  const name = shell.user.name.length > 24 ? shell.user.name.slice(0, 22) + "..." : shell.user.name;
  ctx.fillText(name, nameX, y + 1);

  const nameW = ctx.measureText(name).width;
  const country = shell.user.country?.toUpperCase();
  if (country && country.length === 2) {
    ctx.font = `700 9px ${MONO}`;
    const tagW = ctx.measureText(country).width + 10;
    drawRoundedRect(ctx, nameX + nameW + 8, y + 3, tagW, 15, 3, BG_OVERLAY);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.textBaseline = "middle";
    ctx.fillText(country, nameX + nameW + 13, y + 10);
    ctx.textBaseline = "top";
  }

  const headerW = topRightX - nameX - 12;
  ctx.font = `600 12px ${SANS}`;
  ctx.fillStyle = shell.titleColor;
  ctx.fillText(truncate(ctx, shell.title, headerW), nameX, y + 24);

  if (shell.subtitle) {
    ctx.font = `500 11px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(truncate(ctx, shell.subtitle, headerW), nameX, y + 40);
  }

  const finish = async () => {
    try {
      const logo = await loadImage(await readFile(join(ASSETS_DIR, "logo.png")));
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(logo, FEED_RIGHT - 14, CARD_Y + contentH - 22, 14, 14);
      ctx.restore();
    } catch {
      /* logo not available */
    }
    return canvas.toBuffer("image/png");
  };

  return { ctx, finish };
}

export function drawBody(
  ctx: Ctx,
  kicker: string,
  kickerColor: string,
  title: string,
  description?: string | null
): void {
  const x = FEED_LEFT + 70;
  const maxW = FEED_RIGHT - x;
  const y = FEED_BODY_TOP;

  ctx.font = `700 10px ${MONO}`;
  ctx.fillStyle = kickerColor;
  ctx.fillText(kicker.toUpperCase(), x, y + 2);

  ctx.font = `700 18px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(truncate(ctx, title, maxW), x, y + 16);

  if (description) {
    ctx.font = `400 12px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    wrapText(ctx, description, maxW, 2).forEach((line, i) => ctx.fillText(line, x, y + 38 + i * 16));
  }
}
