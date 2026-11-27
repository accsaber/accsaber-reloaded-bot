import type { MilestoneTier } from "../types/api.js";
import { type CardResult, type CardUser, drawBody, numberFmt, openFeedCard } from "./canvas-utils.js";
import { playerUrl } from "./embeds.js";
import { badgePainter, resolveBadgeTier, resolveMilestoneGlyph } from "./milestone-badge.js";

export interface MilestoneSetCardData {
  user: CardUser;
  set: {
    title: string;
    description?: string;
    bonusXp: number;
  };
  title: string;
  subtitle?: string;
  accentColor: string;
  level?: number;
}

export interface MilestoneCardData {
  user: CardUser;
  milestone: {
    title: string;
    description?: string;
    tier: MilestoneTier;
    iconGroup?: string;
    querySpec?: unknown;
    xp: number;
  };
  title: string;
  subtitle?: string;
  accentColor: string;
  category?: { name: string; code: string };
  level?: number;
}

const TIER_HEX: Record<MilestoneTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#36cfb0",
  diamond: "#b9f2ff",
  apex: "#a855f7",
};

export const TIER_LABEL: Record<MilestoneTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  apex: "Apex",
};

export async function renderMilestoneCard(
  data: MilestoneCardData
): Promise<CardResult> {
  const { user, milestone } = data;
  const tierHex = TIER_HEX[milestone.tier];
  const badge = badgePainter(
    resolveBadgeTier(milestone.tier),
    resolveMilestoneGlyph(milestone.iconGroup, milestone.querySpec),
    tierHex
  );

  const { ctx, finish } = await openFeedCard({
    user,
    level: data.level,
    title: data.title,
    titleColor: data.accentColor,
    subtitle: data.subtitle,
    backdropArt: badge,
  });

  const bottom = drawBody(ctx, {
    art: { img: null, paint: badge },
    loud: true,
    title: milestone.title,
    reward: { text: `${numberFmt(milestone.xp, 0)} XP`, color: tierHex },
    description: milestone.description,
  });

  return { image: finish(bottom), profileUrl: playerUrl(user.id) };
}

export async function renderMilestoneSetCard(
  data: MilestoneSetCardData
): Promise<CardResult> {
  const { user, set, accentColor } = data;
  const badge = badgePainter("gold", "MILESTONE", accentColor);

  const { ctx, finish } = await openFeedCard({
    user,
    level: data.level,
    title: data.title,
    titleColor: accentColor,
    subtitle: data.subtitle,
    backdropArt: badge,
  });

  const bottom = drawBody(ctx, {
    art: { img: null, paint: badge },
    loud: true,
    title: set.title,
    reward: { text: `${numberFmt(set.bonusXp, 0)} XP`, color: accentColor },
    description: set.description,
  });

  return { image: finish(bottom), profileUrl: playerUrl(user.id) };
}
