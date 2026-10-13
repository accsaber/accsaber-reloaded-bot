import type { ScoreResponse } from "../types/api.js";
import {
  BG_OVERLAY,
  CATEGORY_HEX,
  FEED_BODY_TOP,
  FEED_LEFT,
  FEED_RIGHT,
  MONO,
  SANS,
  SUCCESS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  drawRoundedRect,
  formatDifficulty,
  loadOptionalImage,
  numberFmt,
  openFeedCard,
  roundRect,
  truncate,
} from "./canvas-utils.js";

export interface FeedCardData {
  score: ScoreResponse;
  title: string;
  accentColor: string;
  categoryCode: string;
  categoryName: string;
  level?: number;
  complexity?: number;
  subtitle?: string;
  extraInfo?: string;
}

export interface FeedCardResult {
  image: Buffer;
  profileUrl: string;
  mapUrl: string;
  replayUrl: string | null;
}

export async function renderFeedCard(data: FeedCardData): Promise<FeedCardResult> {
  const { score, accentColor } = data;
  const catColor = CATEGORY_HEX[data.categoryCode] ?? CATEGORY_HEX.overall;

  const { ctx, finish } = await openFeedCard(220, {
    user: { name: score.userName, country: score.country, avatarUrl: score.avatarUrl },
    level: data.level,
    title: data.title,
    titleColor: accentColor,
    subtitle: data.subtitle,
    chips: [{ label: data.categoryName, color: catColor }],
    wash: catColor,
  });

  const leftX = FEED_LEFT;
  const rightEdge = FEED_RIGHT;
  let curY = FEED_BODY_TOP - 2;

  const coverSize = 44;

  const coverImg = await loadOptionalImage(score.coverUrl);

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
  const songName = truncate(ctx, score.songName, maxSongW);
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
    ctx.fillText(data.extraInfo, songX, curY + 38);
  }

  curY += coverSize + 10;

  const apStr = numberFmt(score.ap, 2);
  const accStr = `${(score.accuracy * 100).toFixed(2)}%`;
  const rankStr = `#${score.rank}`;
  const isFC = score.misses === 0 && score.badCuts === 0;

  ctx.font = `700 28px ${MONO}`;
  const apW = ctx.measureText(apStr).width;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(apStr, leftX, curY);

  ctx.font = `700 11px ${MONO}`;
  ctx.fillStyle = catColor;
  ctx.fillText("AP", leftX + apW + 6, curY + 14);

  ctx.font = `600 15px ${MONO}`;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.fillText(accStr, leftX, curY + 36);
  const accW = ctx.measureText(accStr).width;

  ctx.font = `400 11px ${MONO}`;
  ctx.fillStyle = TEXT_TERTIARY;
  ctx.fillText(
    `weighted ${numberFmt(score.weightedAp, 2)}`,
    leftX + accW + 10,
    curY + 40
  );

  ctx.font = `600 18px ${MONO}`;
  ctx.fillStyle = score.rank === 1 ? catColor : TEXT_PRIMARY;
  const rankW = ctx.measureText(rankStr).width;
  ctx.fillText(rankStr, rightEdge - rankW, curY + 2);

  const rightParts: { text: string; color: string }[] = [];
  if (isFC) rightParts.push({ text: "FC", color: SUCCESS });
  else rightParts.push({ text: comboText(score), color: TEXT_SECONDARY });
  if (score.streak115 > 0) rightParts.push({ text: `${score.streak115}x115`, color: TEXT_SECONDARY });

  ctx.font = `500 11px ${MONO}`;
  const rightLabel = rightParts.map((p) => p.text).join("  ");
  const rightLabelW = ctx.measureText(rightLabel).width;
  let drawX = rightEdge - rightLabelW;

  for (let i = 0; i < rightParts.length; i++) {
    if (i > 0) {
      drawX += ctx.measureText("  ").width;
    }
    ctx.fillStyle = rightParts[i].color;
    ctx.fillText(rightParts[i].text, drawX, curY + 30);
    drawX += ctx.measureText(rightParts[i].text).width;
  }

  return {
    image: await finish(),
    profileUrl: `https://accsaber.com/players/${score.userId}`,
    mapUrl: `https://accsaber.com/maps/${score.mapId}?difficultyId=${score.mapDifficultyId}`,
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
