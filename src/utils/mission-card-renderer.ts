import type { MissionBand } from "../types/api.js";
import { type CardResult, type CardUser, CATEGORY_HEX, drawBody, numberFmt, openFeedCard } from "./canvas-utils.js";
import { playerUrl } from "./embeds.js";
import { badgePainter, type BadgeTier } from "./milestone-badge.js";

export interface MissionCardData {
  user: CardUser;
  mission: {
    name: string;
    description: string;
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

const BAND_FRAME: Record<MissionBand, BadgeTier> = {
  easy: "bronze",
  medium: "silver",
  hard: "gold",
  extreme: "apex",
};

export async function renderMissionCard(
  data: MissionCardData
): Promise<CardResult> {
  const { user, mission } = data;
  const accent = CATEGORY_HEX[data.category?.code ?? "overall"] ?? CATEGORY_HEX.overall;

  const badge = badgePainter(BAND_FRAME[mission.band] ?? "bronze", "MISSION", accent);

  const { ctx, finish } = await openFeedCard({
    user,
    level: data.level,
    title: data.title,
    titleColor: accent,
    backdropArt: badge,
  });

  const xp = mission.xpAwarded ?? 0;
  const bottom = drawBody(ctx, {
    art: { img: null, paint: badge },
    loud: true,
    title: mission.name,
    reward: xp > 0 && { text: `${numberFmt(xp, 0)} XP`, color: accent },
    description: mission.description,
  });

  return { image: finish(bottom), profileUrl: playerUrl(user.id) };
}
