import type { MilestoneTier, MilestoneType } from "../types/api.js";
import {
  CATEGORY_HEX,
  FEED_BODY_TOP,
  FEED_LEFT,
  drawBigValue,
  drawBody,
  drawFlagIcon,
  drawStackIcon,
  drawTrophyIcon,
  numberFmt,
  openFeedCard,
} from "./canvas-utils.js";

export type MilestoneTriggerKind = "first" | "rare" | "diamond_plus";

export interface MilestoneSetCardData {
  user: { id: string; name: string; country: string | null; avatarUrl: string | null };
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
  user: { id: string; name: string; country: string | null; avatarUrl: string | null };
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

export interface MilestoneCardResult {
  image: Buffer;
  profileUrl: string;
}

export const TIER_HEX: Record<MilestoneTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#4dd9e0",
  diamond: "#b9f2ff",
  apex: "#ff2e92",
};

export const TIER_LABEL: Record<MilestoneTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  apex: "Apex",
};

const STRONG_GLOW_TIERS: Set<MilestoneTier> = new Set(["diamond", "apex"]);

export async function renderMilestoneCard(
  data: MilestoneCardData
): Promise<MilestoneCardResult> {
  const { user, milestone } = data;
  const tierHex = TIER_HEX[milestone.tier];
  const washColor = data.category
    ? CATEGORY_HEX[data.category.code] ?? CATEGORY_HEX.overall
    : tierHex;

  const { ctx, finish } = await openFeedCard(210, {
    user,
    level: data.level,
    title: data.title,
    titleColor: data.accentColor,
    subtitle: data.subtitle,
    chips: data.category
      ? [{ label: data.category.name, color: CATEGORY_HEX[data.category.code] ?? CATEGORY_HEX.overall }]
      : [],
    wash: washColor,
  });

  const drawIcon = milestone.type === "achievement" ? drawTrophyIcon : drawFlagIcon;
  drawIcon(ctx, FEED_LEFT, FEED_BODY_TOP, 56, tierHex, {
    color: tierHex,
    blur: STRONG_GLOW_TIERS.has(milestone.tier) ? 26 : 14,
  });
  drawBody(ctx, TIER_LABEL[milestone.tier], tierHex, milestone.title, milestone.description);
  drawBigValue(ctx, FEED_LEFT, FEED_BODY_TOP + 70, numberFmt(milestone.xp, 0), "XP", washColor);

  return { image: await finish(), profileUrl: `https://accsaber.com/players/${user.id}` };
}

export async function renderMilestoneSetCard(
  data: MilestoneSetCardData
): Promise<MilestoneCardResult> {
  const { user, set, accentColor } = data;

  const { ctx, finish } = await openFeedCard(210, {
    user,
    level: data.level,
    title: data.title,
    titleColor: accentColor,
    subtitle: data.subtitle,
    wash: accentColor,
    washAlpha: 0.18,
  });

  drawStackIcon(ctx, FEED_LEFT, FEED_BODY_TOP, 56, accentColor, { color: accentColor, blur: 26 });
  drawBody(ctx, "Milestone set", accentColor, set.title, set.description);
  drawBigValue(ctx, FEED_LEFT, FEED_BODY_TOP + 70, numberFmt(set.bonusXp, 0), "BONUS XP", accentColor);

  return { image: await finish(), profileUrl: `https://accsaber.com/players/${user.id}` };
}
