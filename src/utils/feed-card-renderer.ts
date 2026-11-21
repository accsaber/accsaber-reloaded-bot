import type { ScoreResponse } from "../types/api.js";
import {
  type CardResult,
  CATEGORY_HEX,
  FEED_RIGHT,
  SUCCESS,
  TEXT_PRIMARY,
  TEXT_TERTIARY,
  difficultySegment,
  drawBody,
  drawLine,
  loadOptionalImage,
  numberFmt,
  openFeedCard,
} from "./canvas-utils.js";
import { WEBSITE_URL, playerUrl } from "./embeds.js";

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
  loud?: boolean;
}

interface FeedCardResult extends CardResult {
  mapUrl: string;
  replayUrl: string | null;
}

export async function renderFeedCard(data: FeedCardData): Promise<FeedCardResult> {
  const { score } = data;
  const catColor = CATEGORY_HEX[data.categoryCode] ?? CATEGORY_HEX.overall;

  const [{ ctx, finish }, cover] = await Promise.all([
    openFeedCard({
      user: { name: score.userName, country: score.country, avatarUrl: score.avatarUrl },
      level: data.level,
      title: data.title,
      titleColor: data.accentColor,
      subtitle: data.subtitle,
      backdropUrl: data.loud ? score.coverUrl : null,
    }),
    loadOptionalImage(score.coverUrl),
  ]);

  const bottom = drawBody(ctx, {
    art: { img: cover },
    loud: data.loud,
    title: [
      { text: score.songName },
      { ...difficultySegment(score.difficulty), size: 12, weight: 600 },
      data.complexity ? { text: data.complexity.toFixed(1), color: TEXT_TERTIARY, size: 12, weight: 500 } : null,
      { text: data.categoryName, color: catColor, size: 12, weight: 600 },
    ],
    reward: { text: `${numberFmt(score.ap, 2)} AP`, color: TEXT_PRIMARY, size: 28 },
    rewardNote: `${numberFmt(score.weightedAp, 2)} weighted`,
    description: `${score.songAuthor} · ${score.mapAuthor}`,
    lines: [
      [{ text: data.extraInfo ?? "" }],
      [{ text: `${(score.accuracy * 100).toFixed(2)}%` }],
    ],
  });

  drawLine(
    ctx,
    FEED_RIGHT,
    bottom - 17,
    [
      score.streak115 > 0 && { text: `${score.streak115}x115` },
      comboSegment(score),
      { text: `#${score.rank}`, color: score.rank === 1 ? catColor : TEXT_PRIMARY, weight: 700 },
    ],
    { size: 13, gap: 12, align: "right" }
  );

  return {
    image: finish(bottom),
    profileUrl: playerUrl(score.userId),
    mapUrl: `${WEBSITE_URL}/maps/${score.mapId}?difficultyId=${score.mapDifficultyId}`,
    replayUrl: score.blScoreId
      ? `https://replay.beatleader.com/?scoreId=${score.blScoreId}`
      : null,
  };
}

function comboSegment(score: ScoreResponse): { text: string; color?: string } {
  if (score.misses === 0 && score.badCuts === 0) return { text: "FC", color: SUCCESS };
  const parts: string[] = [];
  if (score.misses > 0) parts.push(`${score.misses}m`);
  if (score.badCuts > 0) parts.push(`${score.badCuts}bc`);
  return { text: parts.join("/") };
}
