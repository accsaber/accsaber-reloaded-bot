import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MilestoneTier, MilestoneType } from "../types/api.js";
import {
  ASSETS_DIR,
  BG_BASE,
  BG_ELEVATED,
  BG_OVERLAY,
  CATEGORY_HEX,
  MONO,
  SANS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  drawFlagIcon,
  drawRoundedRect,
  drawTrophyIcon,
  fetchImage,
  hexWithAlpha,
  numberFmt,
  registerFonts,
  roundRect,
} from "./canvas-utils.js";
import { getTierForLevel } from "./roles.js";

export type MilestoneTriggerKind = "first" | "rare" | "diamond_plus";

export interface MilestoneCardData {
  user: { id: string; name: string; country: string; avatarUrl: string };
  milestone: {
    id: string;
    title: string;
    description?: string;
    type: MilestoneType;
    tier: MilestoneTier;
    xp: number;
    categoryId?: string;
  };
  trigger: MilestoneTriggerKind;
  title: string;
  subtitle?: string;
  accentColor: string;
  category?: { name: string; code: string };
  level?: number;
}

export interface MilestoneCardResult {
  image: Buffer;
  profileUrl: string;
}

const W = 680;
const CARD_X = 18;
const CARD_Y = 14;
const CARD_W = W - CARD_X * 2;
const PAD = 22;

export const TIER_HEX: Record<MilestoneTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#4dd9e0",
  diamond: "#b9f2ff",
  apex: "#ff2e92",
};

const TIER_LABEL: Record<MilestoneTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  apex: "Apex",
};

const STRONG_GLOW_TIERS: Set<MilestoneTier> = new Set(["diamond", "apex"]);

export async function renderMilestoneCard(
  data: MilestoneCardData
): Promise<MilestoneCardResult> {
  registerFonts();

  const { user, milestone, accentColor } = data;
  const tierHex = TIER_HEX[milestone.tier];
  const tierLabel = TIER_LABEL[milestone.tier];
  const strongGlow = STRONG_GLOW_TIERS.has(milestone.tier);
  const washColor = data.category
    ? CATEGORY_HEX[data.category.code] ?? CATEGORY_HEX.overall
    : tierHex;

  const tierInfo = data.level ? getTierForLevel(data.level) : undefined;
  const levelTierHex = tierInfo
    ? `#${tierInfo.color.toString(16).padStart(6, "0")}`
    : TEXT_SECONDARY;

  const contentH = 210;
  const H = CARD_Y * 2 + contentH;
  const CARD_H = contentH;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG_BASE;
  ctx.fillRect(0, 0, W, H);

  let avatarImg: Awaited<ReturnType<typeof loadImage>> | null = null;
  try {
    avatarImg = await fetchImage(user.avatarUrl);
  } catch {
    /* skip */
  }

  drawRoundedRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 12, "#13131c", BG_OVERLAY);

  ctx.save();
  roundRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 12);
  ctx.clip();
  const wash = ctx.createRadialGradient(
    CARD_X + CARD_W - 60,
    CARD_Y + 20,
    0,
    CARD_X + CARD_W - 60,
    CARD_Y + 20,
    420
  );
  wash.addColorStop(0, hexWithAlpha(washColor, 0.16));
  wash.addColorStop(1, hexWithAlpha(washColor, 0));
  ctx.fillStyle = wash;
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H);
  ctx.restore();

  const leftX = CARD_X + PAD + 4;
  const rightEdge = CARD_X + CARD_W - PAD;
  let curY = CARD_Y + PAD - 2;

  ctx.textBaseline = "top";

  let topRightX = rightEdge;
  if (data.category) {
    const catLabel = data.category.name.toUpperCase();
    const catColor = CATEGORY_HEX[data.category.code] ?? CATEGORY_HEX.overall;
    ctx.font = `700 10px ${MONO}`;
    const catW = ctx.measureText(catLabel).width + 16;
    const catBadgeX = rightEdge - catW;
    drawRoundedRect(ctx, catBadgeX, curY + 4, catW, 18, 4, hexWithAlpha(catColor, 0.14));
    ctx.fillStyle = catColor;
    ctx.textBaseline = "middle";
    ctx.fillText(catLabel, catBadgeX + 8, curY + 13);
    ctx.textBaseline = "top";
    topRightX = catBadgeX;
  }

  const avSize = 50;
  const avPad = 2;
  const borderSize = avSize + avPad * 2;

  drawRoundedRect(
    ctx,
    leftX - avPad,
    curY - avPad,
    borderSize,
    borderSize,
    10,
    BG_ELEVATED
  );

  if (avatarImg) {
    ctx.save();
    roundRect(ctx, leftX - avPad, curY - avPad, borderSize, borderSize, 10);
    ctx.clip();
    ctx.drawImage(avatarImg, leftX - avPad, curY - avPad, borderSize, borderSize);
    ctx.restore();
  }

  roundRect(ctx, leftX - avPad, curY - avPad, borderSize, borderSize, 10);
  ctx.strokeStyle = levelTierHex;
  ctx.lineWidth = avPad;
  ctx.stroke();

  const nameX = leftX + avSize + 12;
  ctx.font = `700 17px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  let displayName = user.name;
  if (displayName.length > 24) displayName = displayName.slice(0, 22) + "...";
  ctx.fillText(displayName, nameX, curY + 1);

  const nameW = ctx.measureText(displayName).width;
  const country = user.country?.toUpperCase();
  if (country && country.length === 2) {
    ctx.font = `700 9px ${MONO}`;
    const tagW = ctx.measureText(country).width + 10;
    drawRoundedRect(ctx, nameX + nameW + 8, curY + 3, tagW, 15, 3, BG_OVERLAY);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.textBaseline = "middle";
    ctx.fillText(country, nameX + nameW + 13, curY + 10);
    ctx.textBaseline = "top";
  }

  ctx.font = `600 12px ${SANS}`;
  ctx.fillStyle = accentColor;
  const maxTitleW = topRightX - nameX - 12;
  let titleText = data.title;
  while (ctx.measureText(titleText).width > maxTitleW && titleText.length > 10) {
    titleText = titleText.slice(0, -4) + "...";
  }
  ctx.fillText(titleText, nameX, curY + 24);

  if (data.subtitle) {
    ctx.font = `500 11px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(data.subtitle, nameX, curY + 40);
  }

  curY += avSize + 18;

  const flagSize = 56;
  const flagX = leftX;
  const flagY = curY;

  const drawIcon = milestone.type === "achievement" ? drawTrophyIcon : drawFlagIcon;
  drawIcon(ctx, flagX, flagY, flagSize, tierHex, {
    color: tierHex,
    blur: strongGlow ? 26 : 14,
  });

  const titleX = flagX + flagSize + 14;
  const titleMaxW = rightEdge - titleX;

  ctx.font = `700 10px ${MONO}`;
  ctx.fillStyle = tierHex;
  ctx.fillText(tierLabel.toUpperCase(), titleX, flagY + 2);

  ctx.font = `700 18px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  let msTitle = milestone.title;
  while (ctx.measureText(msTitle).width > titleMaxW && msTitle.length > 10) {
    msTitle = msTitle.slice(0, -4) + "...";
  }
  ctx.fillText(msTitle, titleX, flagY + 16);

  if (milestone.description) {
    ctx.font = `400 12px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    const desc = wrapText(ctx, milestone.description, titleMaxW, 2);
    let y = flagY + 38;
    for (const line of desc) {
      ctx.fillText(line, titleX, y);
      y += 16;
    }
  }

  curY += flagSize + 14;

  const xpStr = numberFmt(milestone.xp, 0);
  ctx.font = `700 28px ${MONO}`;
  const xpW = ctx.measureText(xpStr).width;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(xpStr, leftX, curY);

  ctx.font = `700 11px ${MONO}`;
  ctx.fillStyle = washColor;
  ctx.fillText("XP", leftX + xpW + 6, curY + 14);

  if (data.trigger === "first") {
    const chipLabel = "FIRST EVER";
    ctx.font = `700 10px ${MONO}`;
    const labelW = ctx.measureText(chipLabel).width + 16;
    const chipX = rightEdge - labelW;
    drawRoundedRect(ctx, chipX, curY + 6, labelW, 18, 4, hexWithAlpha(accentColor, 0.16));
    ctx.fillStyle = accentColor;
    ctx.textBaseline = "middle";
    ctx.fillText(chipLabel, chipX + 8, curY + 15);
    ctx.textBaseline = "top";
  }

  const footY = CARD_Y + CARD_H - 22;
  try {
    const logoBuf = await readFile(join(ASSETS_DIR, "logo.png"));
    const logoImg = await loadImage(logoBuf);
    const logoSize = 14;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(logoImg, rightEdge - logoSize, footY, logoSize, logoSize);
    ctx.restore();
  } catch {
    /* logo not available */
  }

  return {
    image: canvas.toBuffer("image/png"),
    profileUrl: `https://accsaberreloaded.com/players/${user.id}`,
  };
}

function wrapText(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
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
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + "...").width > maxWidth && last.length > 4) {
      last = last.slice(0, -2);
    }
    if (ctx.measureText(last).width + ctx.measureText("...").width > maxWidth) {
      last = last.slice(0, -3) + "...";
    } else if (
      words.length > lines.flatMap((l) => l.split(/\s+/)).length
    ) {
      last = last + "...";
    }
    lines[maxLines - 1] = last;
  }

  return lines;
}
