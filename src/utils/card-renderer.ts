import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  LevelResponse,
  ScoreResponse,
  StatsDiffResponse,
  UserCategoryStatisticsResponse,
} from "../types/api.js";
import { getTierForLevel } from "./roles.js";
import { formatDifficulty } from "./score-feed-embeds.js";

const ASSETS = existsSync(join(process.cwd(), "src", "assets"))
  ? join(process.cwd(), "src", "assets")
  : join(process.cwd(), "assets");
const FONTS = join(ASSETS, "fonts");

const BG_BASE = "#0a0a0f";
const BG_ELEVATED = "#1e1e2e";
const BG_OVERLAY = "#2a2a3a";
const TEXT_PRIMARY = "#e8e8f0";
const TEXT_SECONDARY = "#8888a0";
const TEXT_TERTIARY = "#5a5a72";
const SUCCESS = "#22c55e";
const ERROR = "#ef4444";

const CATEGORY_HEX: Record<string, string> = {
  overall: "#a855f7",
  true_acc: "#22c55e",
  standard_acc: "#3b82f6",
  tech_acc: "#ef4444",
  low_mid: "#eab308",
};

const CATEGORY_LABEL: Record<string, string> = {
  overall: "Overall",
  true_acc: "True Acc",
  standard_acc: "Standard Acc",
  tech_acc: "Tech Acc",
  low_mid: "Low Mid",
};

const SANS = '"Inter", "Segoe UI", sans-serif';
const MONO = '"Cascadia", "Cascadia Code", "Consolas", monospace';

let fontsRegistered = false;

export function registerFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;
  const register = (file: string, family: string) => {
    const path = join(FONTS, file);
    if (existsSync(path)) GlobalFonts.registerFromPath(path, family);
  };
  register("Inter.ttf", "Inter");
  register("CascadiaCode-Regular.ttf", "Cascadia");
  register("CascadiaCode-Bold.ttf", "Cascadia");
}

export interface ProfileCardData {
  name: string;
  avatarUrl: string;
  country: string;
  categoryCode: string;
  level?: LevelResponse;
  stats?: UserCategoryStatisticsResponse;
  diff?: StatsDiffResponse;
  topScores: ScoreResponse[];
  categoryIdToCode: Record<string, string>;
}

type Ctx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

function drawRoundedRect(
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

function numberFmt(n: number, decimals: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function trendStr(
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

async function fetchImage(url: string): Promise<ReturnType<typeof loadImage>> {
  const res = await fetch(url);
  return loadImage(Buffer.from(await res.arrayBuffer()));
}

const W = 900;
const H = 620;

export async function renderProfileCard(data: ProfileCardData): Promise<Buffer> {
  registerFonts();

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const accent = CATEGORY_HEX[data.categoryCode] ?? CATEGORY_HEX.overall;
  const tierInfo = data.level ? getTierForLevel(data.level.level) : undefined;
  const tierHex = tierInfo
    ? `#${tierInfo.color.toString(16).padStart(6, "0")}`
    : accent;

  ctx.fillStyle = BG_BASE;
  ctx.fillRect(0, 0, W, H);

  let avatarImg: Awaited<ReturnType<typeof loadImage>> | null = null;
  try {
    avatarImg = await fetchImage(data.avatarUrl);
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.filter = "blur(40px)";
    ctx.drawImage(avatarImg, -80, -80, W + 160, H + 160);
    ctx.restore();
  } catch { /* solid bg fallback */ }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(10, 10, 15, 0.5)");
  grad.addColorStop(1, "rgba(10, 10, 15, 0.95)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const cardX = 24;
  const cardY = 20;
  const cardW = W - 48;
  const cardH = H - 40;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 12, "rgba(20, 20, 31, 0.85)", BG_OVERLAY);

  const avSize = 80;
  const avX = 56;
  const avY = 52;
  const avPad = 3;

  const borderSize = avSize + avPad * 2;
  const borderX = avX - avPad;
  const borderY = avY - avPad;

  ctx.save();
  ctx.shadowColor = tierHex;
  ctx.shadowBlur = 16;
  drawRoundedRect(ctx, borderX, borderY, borderSize, borderSize, 12, BG_ELEVATED);
  ctx.restore();

  if (avatarImg) {
    ctx.save();
    roundRect(ctx, borderX, borderY, borderSize, borderSize, 12);
    ctx.clip();
    ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
    ctx.restore();
  }

  roundRect(ctx, borderX, borderY, borderSize, borderSize, 12);
  ctx.strokeStyle = tierHex;
  ctx.lineWidth = avPad;
  ctx.stroke();

  const nameX = avX + avSize + 20;
  const nameY = avY + 12;

  ctx.font = `700 28px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.textBaseline = "top";
  ctx.fillText(data.name, nameX, nameY);

  const nameWidth = ctx.measureText(data.name).width;
  const country = data.country?.toUpperCase();
  if (country && country.length === 2) {
    const tagX = nameX + nameWidth + 12;
    const tagY = nameY + 4;
    ctx.font = `700 11px ${MONO}`;
    const tagW = ctx.measureText(country).width + 12;
    drawRoundedRect(ctx, tagX, tagY, tagW, 20, 4, BG_OVERLAY);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.textBaseline = "middle";
    ctx.fillText(country, tagX + 6, tagY + 10);
    ctx.textBaseline = "top";
  }

  if (data.level) {
    const lvY = nameY + 44;
    ctx.textBaseline = "middle";
    ctx.font = `500 15px ${MONO}`;
    ctx.fillStyle = tierHex;
    const lvText = `Lv.${data.level.level}`;
    ctx.fillText(lvText, nameX, lvY);

    const lvW = ctx.measureText(lvText).width;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = `400 15px ${SANS}`;
    ctx.fillText(` - ${data.level.title}`, nameX + lvW, lvY);
    ctx.textBaseline = "top";

    const barX = nameX;
    const barY = lvY + 24;
    const barW = 220;
    const barH = 5;
    const progress = Math.min(data.level.progressPercent / 100, 1);

    drawRoundedRect(ctx, barX, barY, barW, barH, 2.5, BG_OVERLAY);
    if (progress > 0) {
      drawRoundedRect(ctx, barX, barY, Math.max(barW * progress, barH), barH, 2.5, tierHex);
    }

    ctx.font = `400 11px ${MONO}`;
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.fillText(
      `${numberFmt(data.level.xpForCurrentLevel, 0)} / ${numberFmt(data.level.xpForNextLevel, 0)} XP`,
      barX, barY + 14
    );
  }

  const catLabel = CATEGORY_LABEL[data.categoryCode] ?? "Overall";
  ctx.font = `700 13px ${MONO}`;
  const catW = ctx.measureText(catLabel).width + 24;
  const catX = cardX + cardW - catW - 24;
  const catY = avY + 6;

  drawRoundedRect(ctx, catX, catY, catW, 28, 14, "rgba(0,0,0,0.3)", accent);
  ctx.fillStyle = accent;
  ctx.textBaseline = "middle";
  ctx.fillText(catLabel, catX + 12, catY + 14);

  const statsY = 180;
  const boxW = 185;
  const boxH = 90;
  const boxGap = 16;
  const statsStartX = cardX + 32;

  const boxes: { label: string; value: string; trend: { text: string; color: string } }[] = [];
  if (data.stats) {
    const s = data.stats;
    const d = data.diff;
    boxes.push(
      { label: "TOTAL AP", value: numberFmt(s.ap, 2), trend: trendStr(d?.apDiff) },
      { label: "GLOBAL RANK", value: `#${numberFmt(s.ranking, 0)}`, trend: trendStr(d?.rankingDiff, true) },
      { label: "COUNTRY RANK", value: `#${numberFmt(s.countryRanking, 0)}`, trend: trendStr(d?.countryRankingDiff, true) },
      { label: "AVG ACCURACY", value: `${(s.averageAcc * 100).toFixed(2)}%`, trend: trendStr(d?.averageAccDiff != null ? d.averageAccDiff * 100 : undefined) },
    );
  }

  for (let i = 0; i < boxes.length; i++) {
    const bx = statsStartX + i * (boxW + boxGap);
    const box = boxes[i];

    drawRoundedRect(ctx, bx, statsY, boxW, boxH, 8, BG_ELEVATED, BG_OVERLAY);

    ctx.save();
    roundRect(ctx, bx, statsY, boxW, boxH, 8);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(bx, statsY, 3, boxH);
    ctx.restore();

    ctx.font = `500 11px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.textBaseline = "top";
    ctx.letterSpacing = "0.5px";
    ctx.fillText(box.label, bx + 16, statsY + 14);
    ctx.letterSpacing = "0px";

    ctx.font = `700 22px ${MONO}`;
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.fillText(box.value, bx + 16, statsY + 34);

    if (box.trend.text) {
      ctx.font = `500 12px ${MONO}`;
      ctx.fillStyle = box.trend.color;
      ctx.fillText(box.trend.text, bx + 16, statsY + 64);
    }
  }

  const scoresY = statsY + boxH + 32;

  ctx.font = `600 13px ${SANS}`;
  ctx.fillStyle = TEXT_TERTIARY;
  ctx.textBaseline = "top";
  ctx.letterSpacing = "1px";
  ctx.fillText("TOP SCORES", statsStartX, scoresY);
  ctx.letterSpacing = "0px";

  const coverSize = 34;
  const glowPad = 4;
  const scoreLineH = 44;
  const scoreStartY = scoresY + 26;
  const txStart = statsStartX + 28 + coverSize + glowPad * 2 + 8;
  const scoreMaxW = cardW - 64;

  for (let i = 0; i < data.topScores.length && i < 5; i++) {
    const score = data.topScores[i];
    const rowY = scoreStartY + i * scoreLineH;
    const coverX = statsStartX + 28;
    const coverY = rowY + Math.floor((scoreLineH - coverSize) / 2) - 2;
    const diff = formatDifficulty(score.difficulty);
    const acc = (score.accuracy * 100).toFixed(2);
    const ap = score.ap.toFixed(2);
    const isFC = score.misses === 0 && score.badCuts === 0;

    const scoreCatColor = CATEGORY_HEX[data.categoryIdToCode[score.categoryId]] ?? accent;
    ctx.font = `700 14px ${MONO}`;
    ctx.fillStyle = scoreCatColor;
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}.`, statsStartX, coverY + coverSize / 2);
    ctx.textBaseline = "top";

    let coverImg: Awaited<ReturnType<typeof loadImage>> | null = null;
    if (score.coverUrl) {
      try { coverImg = await fetchImage(score.coverUrl); } catch { /* skip */ }
    }

    if (coverImg) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.filter = "blur(8px) saturate(1.8)";
      ctx.drawImage(
        coverImg,
        coverX - glowPad, coverY - glowPad,
        coverSize + glowPad * 2, coverSize + glowPad * 2
      );
      ctx.restore();
    }

    drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, 5, BG_OVERLAY);
    if (coverImg) {
      ctx.save();
      roundRect(ctx, coverX, coverY, coverSize, coverSize, 5);
      ctx.clip();
      ctx.drawImage(coverImg, coverX, coverY, coverSize, coverSize);
      ctx.restore();
    }

    const topLineY = coverY + 2;
    const botLineY = coverY + 19;

    ctx.font = `500 14px ${SANS}`;
    ctx.fillStyle = TEXT_PRIMARY;
    const maxSongW = scoreMaxW - (txStart - statsStartX) - 300;
    let songText = `${score.songName} `;
    while (ctx.measureText(songText).width > maxSongW && songText.length > 10) {
      songText = songText.slice(0, -4) + "...";
    }
    ctx.fillText(songText, txStart, topLineY);

    const songW = ctx.measureText(songText).width;
    ctx.font = `500 11px ${MONO}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(`[${diff}]`, txStart + songW + 6, topLineY + 2);

    ctx.font = `400 11px ${SANS}`;
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.fillText(
      `${score.songAuthor} · Mapped by ${score.mapAuthor}`,
      txStart, botLineY
    );

    const rankText = `#${score.rank}`;
    const rankColor = score.rank === 1 ? "#ffd700"
      : score.rank === 2 ? "#c0c0c0"
      : score.rank === 3 ? "#cd7f32"
      : TEXT_TERTIARY;

    const rightText = `${acc}%  |  ${ap}ap${isFC ? "  FC" : ""}  ${rankText}`;
    ctx.font = `500 13px ${MONO}`;
    const rightW = ctx.measureText(rightText).width;
    const rightX = cardX + cardW - 32 - rightW;

    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(rightText, rightX, topLineY + 1);

    if (isFC) {
      const fcPartW = ctx.measureText(`  ${rankText}`).width;
      const fcX = cardX + cardW - 32 - ctx.measureText(`FC  ${rankText}`).width;
      ctx.fillStyle = SUCCESS;
      ctx.fillText("FC", fcX, topLineY + 1);
    }

    ctx.fillStyle = rankColor;
    ctx.font = `700 13px ${MONO}`;
    const rankW = ctx.measureText(rankText).width;
    ctx.fillText(rankText, cardX + cardW - 32 - rankW, topLineY + 1);

    const wapText = `(${score.weightedAp.toFixed(2)} weighted)`;
    ctx.font = `400 11px ${MONO}`;
    const wapW = ctx.measureText(wapText).width;
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.fillText(wapText, cardX + cardW - 32 - wapW, botLineY);

    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = BG_OVERLAY;
    ctx.lineWidth = 1;
    const diffW = ctx.measureText(`[${diff}]`).width;
    const leaderStart = txStart + songW + 6 + diffW + 10;
    const leaderEnd = rightX - 10;
    if (leaderEnd > leaderStart) {
      ctx.beginPath();
      ctx.moveTo(leaderStart, topLineY + 10);
      ctx.lineTo(leaderEnd, topLineY + 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (data.topScores.length === 0 && data.stats) {
    ctx.font = `400 14px ${SANS}`;
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.fillText("No scores yet", statsStartX, scoreStartY);
  }

  const footDivY = H - 64;
  const footContentY = footDivY + 10;

  ctx.strokeStyle = BG_OVERLAY;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(statsStartX, footDivY);
  ctx.lineTo(cardX + cardW - 32, footDivY);
  ctx.stroke();

  ctx.font = `400 12px ${SANS}`;
  ctx.fillStyle = TEXT_TERTIARY;
  ctx.textBaseline = "middle";
  ctx.fillText("accsaberreloaded.com", statsStartX, footContentY + 12);

  try {
    const logoBuf = await readFile(join(ASSETS, "logo.png"));
    const logoImg = await loadImage(logoBuf);
    const logoSize = 24;
    ctx.drawImage(logoImg, cardX + cardW - 32 - logoSize, footContentY + 1, logoSize, logoSize);
  } catch { /* logo not available */ }

  return canvas.toBuffer("image/png");
}
