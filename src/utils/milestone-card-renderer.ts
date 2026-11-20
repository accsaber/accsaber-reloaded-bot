import type { MilestoneTier, MilestoneType } from "../types/api.js";
import { type CardResult, type CardUser, TEXT_PRIMARY, drawBody, numberFmt, openFeedCard } from "./canvas-utils.js";
import { playerUrl } from "./embeds.js";

export type MilestoneTriggerKind = "first" | "rare" | "diamond_plus";

export interface MilestoneSetCardData {
  user: CardUser;
  set: {
    id: string;
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
    id: string;
    title: string;
    description?: string;
    type: MilestoneType;
    tier: MilestoneTier;
    xp: number;
    categoryId?: string;
  };
  trigger: MilestoneTriggerKind;
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

  const { ctx, finish } = await openFeedCard({
    user,
    level: data.level,
    title: data.title,
    titleColor: data.accentColor,
    subtitle: data.subtitle,
  });

  const bottom = drawBody(ctx, {
    art: { img: null, icon: milestone.type === "achievement" ? "trophy" : "flag", color: tierHex },
    title: milestone.title,
    description: milestone.description,
    lines: [
      [
        data.trigger !== "diamond_plus" && { text: TIER_LABEL[milestone.tier], color: tierHex },
        { text: `${numberFmt(milestone.xp, 0)} XP`, color: TEXT_PRIMARY },
      ],
    ],
  });

  return { image: finish(bottom), profileUrl: playerUrl(user.id) };
}

export async function renderMilestoneSetCard(
  data: MilestoneSetCardData
): Promise<CardResult> {
  const { user, set, accentColor } = data;

  const { ctx, finish } = await openFeedCard({
    user,
    level: data.level,
    title: data.title,
    titleColor: accentColor,
    subtitle: data.subtitle,
  });

  const bottom = drawBody(ctx, {
    art: { img: null, icon: "stack", color: accentColor },
    title: set.title,
    description: set.description,
    lines: [[{ text: `${numberFmt(set.bonusXp, 0)} bonus XP`, color: TEXT_PRIMARY }]],
  });

  return { image: finish(bottom), profileUrl: playerUrl(user.id) };
}
