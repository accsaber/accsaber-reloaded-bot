import type { MissionBand, MissionPool, MissionType } from "../types/api.js";
import {
  CATEGORY_HEX,
  FEED_BODY_TOP,
  FEED_LEFT,
  drawBigValue,
  drawBody,
  drawTargetIcon,
  numberFmt,
  openFeedCard,
} from "./canvas-utils.js";

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

export const BAND_LABEL: Record<MissionBand, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  extreme: "Extreme",
};

export async function renderMissionCard(
  data: MissionCardData
): Promise<MissionCardResult> {
  const { user, mission } = data;
  const accent = CATEGORY_HEX[data.category?.code ?? "overall"] ?? CATEGORY_HEX.overall;

  const { ctx, finish } = await openFeedCard(210, {
    user,
    level: data.level,
    title: data.title,
    titleColor: accent,
    chips: data.category ? [{ label: data.category.name, color: accent }] : [],
    wash: accent,
    washAlpha: 0.18,
  });

  drawTargetIcon(ctx, FEED_LEFT, FEED_BODY_TOP, 56, accent, {
    color: accent,
    blur: mission.band === "extreme" ? 24 : 14,
  });
  drawBody(ctx, BAND_LABEL[mission.band] ?? mission.band, accent, mission.name, mission.description);

  const xp = mission.xpAwarded ?? 0;
  if (xp > 0) drawBigValue(ctx, FEED_LEFT, FEED_BODY_TOP + 70, numberFmt(xp, 0), "XP", accent);

  return { image: await finish(), profileUrl: `https://accsaber.com/players/${user.id}` };
}
