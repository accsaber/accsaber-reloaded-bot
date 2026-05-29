import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MissionBand, MissionPool, MissionType } from "../types/api.js";
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
  drawRoundedRect,
  drawTargetIcon,
  fetchImage,
  hexWithAlpha,
  numberFmt,
  registerFonts,
  roundRect,
} from "./canvas-utils.js";
import { getTierForLevel } from "./roles.js";

export interface MissionCardData {
  user: {
    id: string;
    name: string;
    country?: string;
    avatarUrl?: string;
  };
  mission: {
    id: string;
    name: string;
    description: string;
    type: MissionType;
    pool: MissionPool;
    band: MissionBand;
    xpAwarded?: number;
  };
  title: string;
  category?: { name: string; code: string };
  level?: number;
}

export interface MissionCardResult {
  image: Buffer;
  profileUrl: string;
}

const W = 680;
const CARD_X = 18;
const CARD_Y = 14;
const CARD_W = W - CARD_X * 2;
const PAD = 22;

const BAND_LABEL: Record<MissionBand, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  extreme: "Extreme",
};

export async function renderMissionCard(
  data: MissionCardData
): Promise<MissionCardResult> {
  registerFonts();

  const { user, mission } = data;
  const bandLabel = BAND_LABEL[mission.band] ?? mission.band.toUpperCase();
  const strongGlow = mission.band === "extreme";
  const accent =
    CATEGORY_HEX[data.category?.code ?? "overall"] ?? CATEGORY_HEX.overall;

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
  if (user.avatarUrl) {
    try {
      avatarImg = await fetchImage(user.avatarUrl);
    } catch {
      /* skip */
    }
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
  wash.addColorStop(0, hexWithAlpha(accent, 0.18));
  wash.addColorStop(1, hexWithAlpha(accent, 0));
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
  ctx.fillStyle = accent;
  const maxTitleW = topRightX - nameX - 12;
  let titleText = data.title;
  while (ctx.measureText(titleText).width > maxTitleW && titleText.length > 10) {
    titleText = titleText.slice(0, -4) + "...";
  }
  ctx.fillText(titleText, nameX, curY + 24);

  curY += avSize + 18;

  const iconSize = 56;
  const iconX = leftX;
  const iconY = curY;

  drawTargetIcon(ctx, iconX, iconY, iconSize, accent, {
    color: accent,
    blur: strongGlow ? 24 : 14,
  });

  const titleX = iconX + iconSize + 14;
  const titleMaxW = rightEdge - titleX;

  ctx.font = `700 10px ${MONO}`;
  ctx.fillStyle = accent;
  ctx.fillText(bandLabel.toUpperCase(), titleX, iconY + 2);

  ctx.font = `700 18px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  let missionName = mission.name;
  while (ctx.measureText(missionName).width > titleMaxW && missionName.length > 10) {
    missionName = missionName.slice(0, -4) + "...";
  }
  ctx.fillText(missionName, titleX, iconY + 16);

  if (mission.description) {
    ctx.font = `400 12px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    const desc = wrapText(ctx, mission.description, titleMaxW, 2);
    let y = iconY + 38;
    for (const line of desc) {
      ctx.fillText(line, titleX, y);
      y += 16;
    }
  }

  curY += iconSize + 14;

  const xpVal = mission.xpAwarded ?? 0;
  if (xpVal > 0) {
    const xpStr = numberFmt(xpVal, 0);
    ctx.font = `700 28px ${MONO}`;
    const xpW = ctx.measureText(xpStr).width;
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.fillText(xpStr, leftX, curY);

    ctx.font = `700 11px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText("XP", leftX + xpW + 6, curY + 14);
  }

  const poolChip = mission.pool.toUpperCase();
  ctx.font = `700 10px ${MONO}`;
  const poolChipW = ctx.measureText(poolChip).width + 16;
  const poolChipX = rightEdge - poolChipW;
  drawRoundedRect(
    ctx,
    poolChipX,
    curY + 6,
    poolChipW,
    18,
    4,
    hexWithAlpha(accent, 0.16)
  );
  ctx.fillStyle = accent;
  ctx.textBaseline = "middle";
  ctx.fillText(poolChip, poolChipX + 8, curY + 15);
  ctx.textBaseline = "top";

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
