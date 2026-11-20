import type { MissionBand, MissionPool, MissionType } from "../types/api.js";
import { type CardResult, type CardUser, CATEGORY_HEX, TEXT_PRIMARY, drawBody, numberFmt, openFeedCard } from "./canvas-utils.js";
import { playerUrl } from "./embeds.js";

export interface MissionCardData {
  user: CardUser;
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

export const BAND_LABEL: Record<MissionBand, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  extreme: "Extreme",
};

export async function renderMissionCard(
  data: MissionCardData
): Promise<CardResult> {
  const { user, mission } = data;
  const accent = CATEGORY_HEX[data.category?.code ?? "overall"] ?? CATEGORY_HEX.overall;

  const { ctx, finish } = await openFeedCard({
    user,
    level: data.level,
    title: data.title,
    titleColor: accent,
  });

  const xp = mission.xpAwarded ?? 0;
  const bottom = drawBody(ctx, {
    art: { img: null, icon: "target", color: accent },
    title: mission.name,
    description: mission.description,
    lines: [[xp > 0 && { text: `${numberFmt(xp, 0)} XP`, color: TEXT_PRIMARY }]],
  });

  return { image: finish(bottom), profileUrl: playerUrl(user.id) };
}
