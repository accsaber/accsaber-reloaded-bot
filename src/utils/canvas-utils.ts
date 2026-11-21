import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { drawIcon } from "./icons.js";
import { getTierForLevel } from "./roles.js";

const FONTS_DIR = existsSync(join(process.cwd(), "src", "assets"))
  ? join(process.cwd(), "src", "assets", "fonts")
  : join(process.cwd(), "assets", "fonts");

export const BG_SURFACE = "#11111c";
const BG_ELEVATED = "#1a1929";
export const BG_OVERLAY = "#2d2a3c";
export const TEXT_PRIMARY = "#e6e4ee";
const TEXT_SECONDARY = "#a6a1bb";
export const TEXT_TERTIARY = "#85809b";
export const SUCCESS = "#22c55e";
const ERROR = "#ef4444";

export const CATEGORY_HEX: Record<string, string> = {
  overall: "#f5b800",
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

const DIFFICULTIES: Record<string, { label: string; color: string }> = {
  EASY: { label: "Easy", color: "#3cb371" },
  NORMAL: { label: "Normal", color: "#4a90d9" },
  HARD: { label: "Hard", color: "#f97316" },
  EXPERT: { label: "Expert", color: "#ef4444" },
  EXPERT_PLUS: { label: "Expert+", color: "#8b5cf6" },
};

export const SANS = '"DM Sans", "Noto Sans JP", system-ui, -apple-system, sans-serif';
const NUM = '"Poppins", "Noto Sans JP", system-ui, sans-serif';
const FLAGS = '"Twemoji Country Flags"';

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
  register("TwemojiCountryFlags.woff2", "Twemoji Country Flags");
}

registerFonts();

export type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;
export type Img = Awaited<ReturnType<typeof loadImage>>;

const loading = new Map<string, Promise<Img | null>>();

export function loadOptionalImage(url: string | null | undefined): Promise<Img | null> {
  if (!url) return Promise.resolve(null);
  let pending = loading.get(url);
  if (!pending) {
    pending = fetch(url)
      .then(async (res) => loadImage(Buffer.from(await res.arrayBuffer())))
      .catch(() => null)
      .finally(() => loading.delete(url));
    loading.set(url, pending);
  }
  return pending;
}

export function numberFmt(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDifficulty(diff: string): string {
  return DIFFICULTIES[diff]?.label ?? diff;
}

export function flagSegment(country: string | null | undefined, size: number): Segment | null {
  if (!country || !/^[a-z]{2}$/i.test(country)) return null;
  const text = String.fromCodePoint(...[...country.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return { text, size, family: FLAGS };
}

export function difficultySegment(diff: string): Segment {
  return { text: formatDifficulty(diff), color: DIFFICULTIES[diff]?.color };
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
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  const months = Math.floor(d / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function ageColor(dateStr: string): string {
  const days = ageInDays(dateStr);
  if (days < 7) return TEXT_PRIMARY;
  return days < 365 ? TEXT_SECONDARY : TEXT_TERTIARY;
}

export function trendSegment(value: number | null | undefined, invert = false): Segment | null {
  if (value == null || Math.abs(value) < 0.005) return null;
  const positive = invert ? value < 0 : value > 0;
  const abs = Math.abs(value);
  return {
    text: `${positive ? "▲" : "▼"} ${Number.isInteger(abs) ? abs : abs.toFixed(2)}`,
    color: positive ? SUCCESS : ERROR,
  };
}

export function fillRoundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawImageBox(
  ctx: Ctx,
  img: Img | null,
  x: number,
  y: number,
  size: number,
  radius: number,
  ring?: { color: string; width: number }
): void {
  fillRoundRect(ctx, x, y, size, size, radius, BG_ELEVATED);
  if (img) {
    const scale = Math.max(size / img.width, size / img.height);
    ctx.save();
    ctx.clip();
    ctx.drawImage(img, x + (size - img.width * scale) / 2, y + (size - img.height * scale) / 2, img.width * scale, img.height * scale);
    ctx.restore();
  }
  if (ring) {
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.width;
    ctx.stroke();
  }
}

export function drawAvatar(ctx: Ctx, img: Img | null, x: number, y: number, size: number, level?: number): void {
  const tier = level ? getTierForLevel(level) : undefined;
  drawImageBox(ctx, img, x, y, size, 8, {
    color: tier ? `#${tier.color.toString(16).padStart(6, "0")}` : BG_OVERLAY,
    width: 2,
  });
}

function truncate(ctx: Ctx, text: string, maxWidth: number): string {
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 4) {
    out = out.slice(0, -4) + "...";
  }
  return out;
}

function wrapText(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const test = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }
    if (lines.length === maxLines - 1) {
      current = truncate(ctx, `${test}...`, maxWidth);
      break;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

export interface Segment {
  text: string;
  color?: string;
  size?: number;
  weight?: number;
  family?: string;
}

export type Line = (Segment | null | undefined | false)[];

interface LineStyle {
  size: number;
  weight?: number;
  family?: string;
  color?: string;
  gap?: number;
  maxWidth?: number;
  align?: "left" | "right";
}

export function drawLine(ctx: Ctx, x: number, y: number, line: Line, style: LineStyle): number {
  const gap = style.gap ?? 10;
  let room = style.maxWidth ?? Infinity;
  const parts: { seg: Segment; font: string; text: string; width: number }[] = [];
  for (const seg of line) {
    if (!seg || !seg.text || room <= 0) continue;
    const font = `${seg.weight ?? style.weight ?? 500} ${seg.size ?? style.size}px ${seg.family ?? style.family ?? NUM}`;
    ctx.font = font;
    const text = truncate(ctx, seg.text, room);
    const width = ctx.measureText(text).width;
    parts.push({ seg, font, text, width });
    room -= width + gap;
  }

  const total = parts.reduce((w, p) => w + p.width, 0) + gap * Math.max(0, parts.length - 1);
  let cursor = style.align === "right" ? x - total : x;
  ctx.textBaseline = "alphabetic";
  for (const part of parts) {
    ctx.font = part.font;
    ctx.fillStyle = part.seg.color ?? style.color ?? TEXT_SECONDARY;
    ctx.fillText(part.text, cursor, y + style.size * 0.82);
    cursor += part.width + gap;
  }
  ctx.textBaseline = "top";
  return total;
}

export function mixHex(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(channel(a, i) * t + channel(b, i) * (1 - t)).toString(16).padStart(2, "0")).join("")}`;
}

const PAD = 24;
const AVATAR = 48;
const ART_GAP = 16;
const BACKDROP_W = 320;
const BACKDROP_ALPHA = 0.3;
const MAX_H = 600;
const BODY_TOP = PAD + AVATAR + 16;
const FEED_W = 600;

export const FEED_LEFT = PAD;
export const FEED_RIGHT = FEED_W - PAD;

export interface CardUser {
  id: string;
  name: string;
  country?: string | null;
  avatarUrl?: string | null;
}

export interface CardResult {
  image: Buffer;
  profileUrl: string;
}

export type ArtPainter = (ctx: Ctx, x: number, y: number, size: number) => void;

interface FeedShell {
  user: Omit<CardUser, "id">;
  level?: number;
  title: string;
  titleColor: string;
  subtitle?: string;
  backdropUrl?: string | null;
  backdropArt?: ArtPainter;
}

export interface FeedArt {
  img: Img | null;
  fit?: "cover" | "contain";
  icon?: string;
  color?: string;
  paint?: ArtPainter;
}

interface FeedBody {
  art?: FeedArt;
  loud?: boolean;
  title: string | Line;
  reward?: Segment | null | false;
  rewardNote?: string;
  description?: string | null;
  lines?: Line[];
}

function drawBackdrop(ctx: Ctx, h: number, img: Img | null, art?: ArtPainter): void {
  const band = createCanvas(BACKDROP_W, h);
  const b = band.getContext("2d");
  if (img) {
    const scale = Math.max(BACKDROP_W / img.width, h / img.height);
    b.drawImage(img, (BACKDROP_W - img.width * scale) / 2, (h - img.height * scale) / 2, img.width * scale, img.height * scale);
  } else if (art) {
    const size = h * 1.5;
    art(b, BACKDROP_W - size * 0.82, (h - size) / 2, size);
  }
  const fade = b.createLinearGradient(0, 0, BACKDROP_W, 0);
  fade.addColorStop(0, "rgba(0, 0, 0, 0)");
  fade.addColorStop(1, `rgba(0, 0, 0, ${BACKDROP_ALPHA})`);
  b.globalCompositeOperation = "destination-in";
  b.fillStyle = fade;
  b.fillRect(0, 0, BACKDROP_W, h);
  ctx.drawImage(band, FEED_W - BACKDROP_W, 0);
}

export async function openFeedCard(
  shell: FeedShell
): Promise<{ ctx: Ctx; finish: (bottom: number) => Buffer }> {
  const content = createCanvas(FEED_W, MAX_H);
  const ctx = content.getContext("2d");
  const [avatar, backdrop] = await Promise.all([
    loadOptionalImage(shell.user.avatarUrl),
    loadOptionalImage(shell.backdropUrl),
  ]);

  drawAvatar(ctx, avatar, FEED_LEFT, PAD, AVATAR, shell.level);

  const textX = FEED_LEFT + AVATAR + 14;
  const maxWidth = FEED_RIGHT - textX;
  drawLine(ctx, textX, PAD, [{ text: shell.user.name, color: TEXT_PRIMARY }, flagSegment(shell.user.country, 15)], {
    size: 17,
    weight: 700,
    family: SANS,
    gap: 8,
    maxWidth,
  });
  drawLine(ctx, textX, PAD + 23, [{ text: shell.title, color: shell.titleColor }], { size: 13, weight: 600, family: SANS, maxWidth });
  drawLine(ctx, textX, PAD + 41, [{ text: shell.subtitle ?? "" }], { size: 12, family: SANS, maxWidth });

  const finish = (bottom: number) => {
    const h = Math.min(MAX_H, Math.round(bottom) + PAD);
    const out = createCanvas(FEED_W, h);
    const o = out.getContext("2d");
    o.fillStyle = BG_SURFACE;
    o.fillRect(0, 0, FEED_W, h);
    if (backdrop || shell.backdropArt) drawBackdrop(o, h, backdrop, shell.backdropArt);
    o.drawImage(content, 0, 0);
    return out.toBuffer("image/png");
  };

  return { ctx, finish };
}

function drawArt(ctx: Ctx, art: FeedArt, size: number): void {
  if (art.paint) {
    art.paint(ctx, FEED_LEFT, BODY_TOP, size);
  } else if (art.img && art.fit === "contain") {
    const scale = Math.min(size / art.img.width, size / art.img.height);
    const w = art.img.width * scale;
    const h = art.img.height * scale;
    ctx.drawImage(art.img, FEED_LEFT + (size - w) / 2, BODY_TOP + (size - h) / 2, w, h);
  } else if (!art.img && art.icon) {
    drawIcon(ctx, art.icon, FEED_LEFT, BODY_TOP, size, art.color ?? TEXT_SECONDARY);
  } else {
    drawImageBox(ctx, art.img, FEED_LEFT, BODY_TOP, size, 4);
  }
}

export function drawBody(ctx: Ctx, body: FeedBody): number {
  const size = body.loud ? 80 : 56;
  const titleSize = body.loud ? 22 : 18;
  const titleH = titleSize + 9;
  if (body.art) drawArt(ctx, body.art, size);

  const x = body.art ? FEED_LEFT + size + ART_GAP : FEED_LEFT;
  const maxWidth = FEED_RIGHT - x;
  ctx.font = `400 13px ${SANS}`;
  const description = body.description ? wrapText(ctx, body.description, maxWidth, 2) : [];
  const lines = (body.lines ?? []).filter((line) => line.some((seg) => seg && seg.text));
  const textH = titleH + (description.length ? description.length * 17 + 5 : 0) + lines.length * 21 - 4;
  let y = BODY_TOP + (body.art ? Math.max(0, (size - textH) / 2) : 0);

  const reward = body.reward
    ? drawLine(ctx, FEED_RIGHT, y, [body.reward], { size: body.reward.size ?? titleSize, weight: 700, align: "right" }) + 16
    : 0;
  if (body.reward && body.rewardNote) {
    drawLine(ctx, FEED_RIGHT, y + (body.reward.size ?? titleSize) + 3, [{ text: body.rewardNote, color: TEXT_TERTIARY }], {
      size: 12,
      align: "right",
    });
  }
  const title = typeof body.title === "string" ? [{ text: body.title }] : body.title;
  drawLine(ctx, x, y, title, { size: titleSize, weight: 700, family: SANS, color: TEXT_PRIMARY, gap: 8, maxWidth: maxWidth - reward });
  y += titleH;

  ctx.font = `400 13px ${SANS}`;
  ctx.fillStyle = TEXT_SECONDARY;
  for (const line of description) {
    ctx.fillText(line, x, y);
    y += 17;
  }
  if (description.length) y += 5;

  for (const line of lines) {
    drawLine(ctx, x, y, line, { size: 13, gap: 12, maxWidth });
    y += 21;
  }

  return Math.max(y - 4, body.art ? BODY_TOP + size : 0);
}
