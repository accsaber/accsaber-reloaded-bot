import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScoreResponse } from "../types/api.js";
import {
  ASSETS_DIR,
  BG_BASE,
  BG_ELEVATED,
  BG_OVERLAY,
  CATEGORY_HEX,
  MONO,
  SANS,
  SUCCESS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  drawRoundedRect,
  fetchImage,
  formatDifficulty,
  numberFmt,
  registerFonts,
  roundRect,
} from "./canvas-utils.js";
import { getTierForLevel } from "./roles.js";

export interface FeedCardData {
  score: ScoreResponse;
  title: string;
  accentColor: string;
  categoryCode: string;
  categoryName: string;
  level?: number;
  complexity?: number;
  subtitle?: string;
  preamble?: string;
  extraInfo?: string;
}

export interface FeedCardResult {
  image: Buffer;
  profileUrl: string;
  mapUrl: string;
  replayUrl: string | null;
}

const W = 680;
const CARD_X = 18;
const CARD_Y = 14;
const CARD_W = W - CARD_X * 2;
const PAD = 22;

const RANK_COLORS: Record<number, string> = {
  1: "#ffd700",
  2: "#c0c0c0",
  3: "#cd7f32",
};

export async function renderFeedCard(data: FeedCardData): Promise<FeedCardResult> {
  registerFonts();

  const { score, accentColor } = data;

  const tierInfo = data.level ? getTierForLevel(data.level) : undefined;
  const tierHex = tierInfo
    ? `#${tierInfo.color.toString(16).padStart(6, "0")}`
    : TEXT_SECONDARY;

  let contentH = 238;
  if (data.preamble) contentH += 18;
  const H = CARD_Y * 2 + contentH;
  const CARD_H = contentH;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG_BASE;
  ctx.fillRect(0, 0, W, H);

  let avatarImg: Awaited<ReturnType<typeof loadImage>> | null = null;
  try { avatarImg = await fetchImage(score.avatarUrl); } catch { /* skip */ }

  if (avatarImg) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.filter = "blur(40px)";
    ctx.drawImage(avatarImg, -80, -80, W + 160, H + 160);
    ctx.restore();
  }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(10, 10, 15, 0.5)");
  grad.addColorStop(1, "rgba(10, 10, 15, 0.95)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  drawRoundedRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 12, "rgba(20, 20, 31, 0.85)", BG_OVERLAY);

  ctx.save();
  roundRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 12);
  ctx.clip();
  ctx.fillStyle = accentColor;
  ctx.fillRect(CARD_X, CARD_Y, 3, CARD_H);
  ctx.restore();

  const leftX = CARD_X + PAD + 4;
  const rightEdge = CARD_X + CARD_W - PAD;
  let curY = CARD_Y + PAD - 2;

  const catLabel = data.categoryName;
  const catColor = CATEGORY_HEX[data.categoryCode] ?? CATEGORY_HEX.overall;
  ctx.font = `700 11px ${MONO}`;
  const catW = ctx.measureText(catLabel).width + 20;
  const catBadgeX = rightEdge - catW;
  drawRoundedRect(ctx, catBadgeX, curY, catW, 22, 11, "rgba(0,0,0,0.3)", catColor);
  ctx.fillStyle = catColor;
  ctx.textBaseline = "middle";
  ctx.fillText(catLabel, catBadgeX + 10, curY + 11);
  ctx.textBaseline = "top";

  const avSize = 50;
  const avPad = 2;
  const borderSize = avSize + avPad * 2;

  ctx.save();
  ctx.shadowColor = tierHex;
  ctx.shadowBlur = 12;
  drawRoundedRect(ctx, leftX - avPad, curY - avPad, borderSize, borderSize, 10, BG_ELEVATED);
  ctx.restore();

  if (avatarImg) {
    ctx.save();
    roundRect(ctx, leftX - avPad, curY - avPad, borderSize, borderSize, 10);
    ctx.clip();
    ctx.drawImage(avatarImg, leftX - avPad, curY - avPad, borderSize, borderSize);
    ctx.restore();
  }

  roundRect(ctx, leftX - avPad, curY - avPad, borderSize, borderSize, 10);
  ctx.strokeStyle = tierHex;
  ctx.lineWidth = avPad;
  ctx.stroke();

  const nameX = leftX + avSize + 12;
  ctx.font = `700 17px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  let displayName = score.userName;
  if (displayName.length > 24) displayName = displayName.slice(0, 22) + "...";
  ctx.fillText(displayName, nameX, curY + 1);

  const nameW = ctx.measureText(displayName).width;
  const country = score.country?.toUpperCase();
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
  const maxTitleW = catBadgeX - nameX - 12;
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

  curY += avSize + 16;

  if (data.preamble) {
    ctx.font = `400 11px ${SANS}`;
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.fillText(data.preamble!, leftX, curY);
    curY += 18;
  }

  const coverSize = 44;
  const glowPad = 3;

  let coverImg: Awaited<ReturnType<typeof loadImage>> | null = null;
  if (score.coverUrl) {
    try { coverImg = await fetchImage(score.coverUrl); } catch { /* skip */ }
  }

  if (coverImg) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.filter = "blur(6px) saturate(1.6)";
    ctx.drawImage(coverImg, leftX - glowPad, curY - glowPad, coverSize + glowPad * 2, coverSize + glowPad * 2);
    ctx.restore();
  }

  drawRoundedRect(ctx, leftX, curY, coverSize, coverSize, 6, BG_OVERLAY);
  if (coverImg) {
    ctx.save();
    roundRect(ctx, leftX, curY, coverSize, coverSize, 6);
    ctx.clip();
    ctx.drawImage(coverImg, leftX, curY, coverSize, coverSize);
    ctx.restore();
  }

  const songX = leftX + coverSize + 12;
  const diff = formatDifficulty(score.difficulty);
  const maxSongW = rightEdge - songX - 80;

  ctx.font = `600 14px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  let songName = score.songName;
  while (ctx.measureText(songName).width > maxSongW && songName.length > 10) {
    songName = songName.slice(0, -4) + "...";
  }
  ctx.fillText(songName, songX, curY + 4);

  const songW = ctx.measureText(songName).width;
  ctx.font = `500 10px ${MONO}`;
  ctx.fillStyle = TEXT_SECONDARY;
  const diffLabel = data.complexity
    ? `[${diff}] ${data.complexity.toFixed(1)}*`
    : `[${diff}]`;
  ctx.fillText(diffLabel, songX + songW + 6, curY + 6);

  ctx.font = `400 11px ${SANS}`;
  ctx.fillStyle = TEXT_TERTIARY;
  ctx.fillText(`${score.songAuthor} - ${score.mapAuthor}`, songX, curY + 24);

  if (data.extraInfo) {
    ctx.font = `400 11px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(data.extraInfo!, songX, curY + 38);
  }

  curY += coverSize + 10;

  const apStr = numberFmt(score.ap, 2);
  const accStr = `${(score.accuracy * 100).toFixed(2)}%`;
  const rankStr = `#${score.rank}`;
  const isFC = score.misses === 0 && score.badCuts === 0;

  ctx.font = `700 26px ${MONO}`;
  const apW = ctx.measureText(apStr).width;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(apStr, leftX, curY);

  ctx.font = `700 12px ${MONO}`;
  ctx.fillStyle = accentColor;
  ctx.fillText(" AP", leftX + apW + 2, curY + 12);

  ctx.font = `600 16px ${MONO}`;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.fillText(accStr, leftX, curY + 32);

  const accW = ctx.measureText(accStr).width;
  ctx.font = `400 11px ${MONO}`;
  ctx.fillStyle = TEXT_TERTIARY;
  ctx.fillText(`  (${numberFmt(score.weightedAp, 2)} weighted)`, leftX + accW, curY + 36);

  ctx.font = `700 18px ${MONO}`;
  ctx.fillStyle = RANK_COLORS[score.rank] ?? TEXT_PRIMARY;
  const rankW = ctx.measureText(rankStr).width;
  ctx.fillText(rankStr, rightEdge - rankW, curY);

  const rightParts: { text: string; color: string }[] = [];
  if (isFC) rightParts.push({ text: "FC", color: SUCCESS });
  else rightParts.push({ text: comboText(score), color: TEXT_SECONDARY });
  if (score.streak115 > 0) rightParts.push({ text: `${score.streak115}x 115`, color: TEXT_SECONDARY });

  ctx.font = `500 12px ${MONO}`;
  let rightLabel = rightParts.map((p) => p.text).join(" | ");
  let rightLabelW = ctx.measureText(rightLabel).width;
  let drawX = rightEdge - rightLabelW;

  for (let i = 0; i < rightParts.length; i++) {
    if (i > 0) {
      ctx.fillStyle = TEXT_TERTIARY;
      ctx.fillText(" | ", drawX, curY + 26);
      drawX += ctx.measureText(" | ").width;
    }
    ctx.fillStyle = rightParts[i].color;
    ctx.fillText(rightParts[i].text, drawX, curY + 26);
    drawX += ctx.measureText(rightParts[i].text).width;
  }

  const footDivY = CARD_Y + CARD_H - 34;
  const footContentY = footDivY + 6;

  ctx.strokeStyle = BG_OVERLAY;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, footDivY);
  ctx.lineTo(rightEdge, footDivY);
  ctx.stroke();

  ctx.font = `400 12px ${SANS}`;
  ctx.fillStyle = TEXT_TERTIARY;
  ctx.textBaseline = "middle";
  ctx.fillText("accsaberreloaded.com", leftX, footContentY + 12);

  try {
    const logoBuf = await readFile(join(ASSETS_DIR, "logo.png"));
    const logoImg = await loadImage(logoBuf);
    const logoSize = 24;
    ctx.drawImage(logoImg, rightEdge - logoSize, footContentY + 1, logoSize, logoSize);
  } catch { /* logo not available */ }

  return {
    image: canvas.toBuffer("image/png"),
    profileUrl: `https://accsaberreloaded.com/players/${score.userId}`,
    mapUrl: `https://accsaberreloaded.com/maps/${score.mapId}?difficultyId=${score.mapDifficultyId}`,
    replayUrl: score.blScoreId
      ? `https://replay.beatleader.com/?scoreId=${score.blScoreId}`
      : null,
  };
}

function comboText(score: ScoreResponse): string {
  if (score.misses === 0 && score.badCuts === 0) return "FC";
  const parts: string[] = [];
  if (score.misses > 0) parts.push(`${score.misses}m`);
  if (score.badCuts > 0) parts.push(`${score.badCuts}bc`);
  return parts.join("/");
}
