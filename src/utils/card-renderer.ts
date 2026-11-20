import { createCanvas } from "@napi-rs/canvas";
import type {
  LevelResponse,
  ScoreResponse,
  StatsDiffResponse,
  UserCategoryStatisticsResponse,
} from "../types/api.js";
import {
  BG_OVERLAY,
  BG_SURFACE,
  CATEGORY_HEX,
  CATEGORY_LABEL,
  SANS,
  SUCCESS,
  TEXT_PRIMARY,
  TEXT_TERTIARY,
  type Ctx,
  type Img,
  type Segment,
  ageColor,
  difficultySegment,
  drawAvatar,
  drawImageBox,
  drawLine,
  fillRoundRect,
  flagSegment,
  loadOptionalImage,
  numberFmt,
  relativeTime,
  trendSegment,
} from "./canvas-utils.js";
import { getTierForLevel } from "./roles.js";

export interface ProfileCardData {
  name: string;
  avatarUrl: string;
  country: string;
  categoryCode: string;
  level?: LevelResponse;
  stats?: UserCategoryStatisticsResponse;
  diff?: StatsDiffResponse;
  topScores: ScoreResponse[];
  scoresLabel: string;
  categoryIdToCode: Record<string, string>;
}

const W = 900;
const PAD = 32;
const RIGHT = W - PAD;
const AVATAR = 80;
const STATS_Y = 148;
const SCORES_Y = 232;
const ROW_H = 46;
const COVER = 34;
const MAX_SCORES = 5;

export async function renderProfileCard(data: ProfileCardData): Promise<Buffer> {
  const scores = data.topScores.slice(0, MAX_SCORES);
  const [avatar, ...covers] = await Promise.all([data.avatarUrl, ...scores.map((s) => s.coverUrl)].map(loadOptionalImage));

  const H = SCORES_Y + 30 + Math.max(1, scores.length) * ROW_H + PAD - 8;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG_SURFACE;
  ctx.fillRect(0, 0, W, H);

  const accent = CATEGORY_HEX[data.categoryCode] ?? CATEGORY_HEX.overall;
  drawAvatar(ctx, avatar, PAD, PAD, AVATAR, data.level?.level);

  const nameX = PAD + AVATAR + 20;
  drawLine(
    ctx,
    nameX,
    PAD + 2,
    [{ text: data.name }, flagSegment(data.country, 22)],
    { size: 28, weight: 700, family: SANS, color: TEXT_PRIMARY, maxWidth: 520 }
  );
  drawLine(ctx, RIGHT, PAD + 8, [{ text: CATEGORY_LABEL[data.categoryCode] ?? "Overall", color: accent }], {
    size: 14,
    weight: 600,
    family: SANS,
    align: "right",
  });

  if (data.level) drawLevel(ctx, data.level, nameX, PAD + 42, accent);
  if (data.stats) drawStats(ctx, data.stats, data.diff);

  drawLine(ctx, PAD, SCORES_Y, [{ text: data.scoresLabel }], { size: 14, weight: 600, family: SANS });
  scores.forEach((score, i) => {
    const color = CATEGORY_HEX[data.categoryIdToCode[score.categoryId]] ?? accent;
    drawScoreRow(ctx, score, covers[i], i, SCORES_Y + 30 + i * ROW_H, color);
  });
  if (scores.length === 0) {
    drawLine(ctx, PAD, SCORES_Y + 30, [{ text: "No scores yet", color: TEXT_TERTIARY }], { size: 14, family: SANS });
  }

  return canvas.toBuffer("image/png");
}

function drawLevel(ctx: Ctx, level: LevelResponse, x: number, y: number, fallback: string): void {
  const tier = getTierForLevel(level.level);
  const color = tier ? `#${tier.color.toString(16).padStart(6, "0")}` : fallback;
  drawLine(ctx, x, y, [{ text: `Level ${level.level}`, color }, { text: level.title }], { size: 15, gap: 8 });

  const barW = 220;
  const progress = Math.min(level.progressPercent / 100, 1);
  fillRoundRect(ctx, x, y + 26, barW, 5, 2.5, BG_OVERLAY);
  if (progress > 0) fillRoundRect(ctx, x, y + 26, Math.max(barW * progress, 5), 5, 2.5, color);
  drawLine(
    ctx,
    x + barW + 12,
    y + 21,
    [{ text: `${numberFmt(level.xpForCurrentLevel, 0)} / ${numberFmt(level.xpForNextLevel, 0)} XP`, color: TEXT_TERTIARY }],
    { size: 12 }
  );
}

function drawStats(ctx: Ctx, s: UserCategoryStatisticsResponse, d?: StatsDiffResponse): void {
  const cells: { label: string; value: string; trend: Segment | null }[] = [
    { label: "Total AP", value: numberFmt(s.ap, 2), trend: trendSegment(d?.apDiff) },
    { label: "Global Rank", value: `#${numberFmt(s.ranking, 0)}`, trend: trendSegment(d?.rankingDiff, true) },
    { label: "Country Rank", value: `#${numberFmt(s.countryRanking, 0)}`, trend: trendSegment(d?.countryRankingDiff, true) },
    {
      label: "Average Accuracy",
      value: `${(s.averageAcc * 100).toFixed(2)}%`,
      trend: trendSegment(d?.averageAccDiff != null ? d.averageAccDiff * 100 : undefined),
    },
  ];
  const cellW = (W - PAD * 2) / cells.length;
  cells.forEach((cell, i) => {
    const x = PAD + i * cellW;
    drawLine(ctx, x, STATS_Y, [{ text: cell.label }], { size: 12, family: SANS });
    drawLine(ctx, x, STATS_Y + 20, [{ text: cell.value, color: TEXT_PRIMARY }, cell.trend && { ...cell.trend, size: 12, weight: 500 }], {
      size: 22,
      weight: 700,
    });
  });
}

function drawScoreRow(ctx: Ctx, score: ScoreResponse, cover: Img | null, i: number, y: number, color: string): void {
  drawLine(ctx, PAD, y + 9, [{ text: `${i + 1}`, color }], { size: 14, weight: 700 });
  drawImageBox(ctx, cover, PAD + 26, y, COVER, 4);

  const x = PAD + 26 + COVER + 12;
  drawLine(ctx, x, y, [{ text: score.songName, color: TEXT_PRIMARY }, { ...difficultySegment(score.difficulty), size: 11, weight: 600 }], {
    size: 14,
    family: SANS,
    gap: 8,
    maxWidth: 440,
  });
  drawLine(ctx, x, y + 19, [{ text: `${score.songAuthor} · ${score.mapAuthor}`, color: TEXT_TERTIARY }], {
    size: 11,
    weight: 400,
    family: SANS,
    maxWidth: 440,
  });

  drawLine(
    ctx,
    RIGHT,
    y,
    [
      { text: `${(score.accuracy * 100).toFixed(2)}%` },
      { text: `${score.ap.toFixed(2)} AP`, color: TEXT_PRIMARY },
      score.misses === 0 && score.badCuts === 0 && { text: "FC", color: SUCCESS },
      { text: `#${score.rank}`, color: score.rank === 1 ? color : TEXT_PRIMARY, weight: 700 },
    ],
    { size: 13, gap: 12, align: "right" }
  );
  drawLine(
    ctx,
    RIGHT,
    y + 19,
    [
      { text: relativeTime(score.timeSet), color: ageColor(score.timeSet) },
      { text: `${score.weightedAp.toFixed(2)} weighted`, color: TEXT_TERTIARY },
    ],
    { size: 11, weight: 400, align: "right" }
  );
}
