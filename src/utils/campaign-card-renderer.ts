import type { CampaignRequirementType, CampaignTargetMode } from "../types/api.js";
import {
  type CardResult,
  type CardUser,
  BG_OVERLAY,
  FEED_LEFT,
  FEED_RIGHT,
  SANS,
  TEXT_PRIMARY,
  TEXT_TERTIARY,
  type FeedArt,
  type Line,
  difficultySegment,
  drawBody,
  drawLine,
  fillRoundRect,
  loadOptionalImage,
  numberFmt,
  openFeedCard,
} from "./canvas-utils.js";
import { playerUrl } from "./embeds.js";

type CampaignCardKind = "milestone" | "completion";

export interface CampaignCardItem {
  name: string;
  quantity: number;
}

export interface CampaignCardObjective {
  type: CampaignRequirementType;
  value?: number | null;
  valueMax?: number | null;
}

interface CampaignCardNode {
  songName: string;
  songAuthor: string;
  mapAuthor: string;
  coverUrl?: string | null;
  difficulty: string;
  characteristic: string;
  modifiers: string[];
  objectives: CampaignCardObjective[];
  objectiveMode: CampaignTargetMode;
  complexity?: number | null;
  nps?: number | null;
}

interface CampaignCardMilestone {
  label: string;
  avatarUrl?: string | null;
  xp: number;
  items: CampaignCardItem[];
  node?: CampaignCardNode;
  userValue?: number | null;
}

export interface CampaignCardData {
  kind: CampaignCardKind;
  user: CardUser;
  campaign: {
    name: string;
    slug: string;
    summary?: string | null;
    iconUrl?: string | null;
    backgroundUrl?: string | null;
    difficultyCount: number;
    completionXp: number;
    completionItems: CampaignCardItem[];
    official: boolean;
    legacy: boolean;
    curated: boolean;
    loved: boolean;
  };
  milestone?: CampaignCardMilestone;
  progress?: {
    completed: number;
    total: number;
    startedAt?: string | null;
    completedAt?: string | null;
  };
  title: string;
  subtitle?: string;
  accentColor: string;
  category?: { name: string; code: string };
  level?: number;
}

const LOVED = "#f472b6";

export function normalizeMilestoneLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

interface RequirementUnit {
  label: string;
  digits: number;
  scale?: number;
  prefix?: string;
  suffix?: string;
  suffixOne?: string;
  valueless?: boolean;
}

const REQUIREMENT_UNITS: Record<CampaignRequirementType, RequirementUnit> = {
  ACC: { label: "accuracy", digits: 2, scale: 100, suffix: "%" },
  AP: { label: "AP", digits: 2, suffix: " AP" },
  SCORE: { label: "score", digits: 0 },
  STREAK_115: { label: "115 streak", digits: 0, suffix: " × 115" },
  COMBO: { label: "combo", digits: 0, suffix: " combo" },
  BOMB_HITS: { label: "bombs", digits: 0, suffix: " bombs", suffixOne: " bomb" },
  RANK: { label: "rank", digits: 0, prefix: "#" },
  FC: { label: "full combo", digits: 0, valueless: true },
  PASS: { label: "pass", digits: 0, valueless: true },
};

function unitSuffix(unit: RequirementUnit, value: number): string {
  if (unit.suffixOne && Math.abs(value) === 1) return unit.suffixOne;
  return unit.suffix ?? "";
}

export function formatMeasure(
  type: CampaignRequirementType,
  value?: number | null
): string {
  const unit = REQUIREMENT_UNITS[type];
  if (!unit) return type;
  if (unit.valueless || value == null) return unit.label;
  return `${unit.prefix ?? ""}${numberFmt(value * (unit.scale ?? 1), unit.digits)}${unitSuffix(unit, value)}`;
}

function formatRequirement(
  type: CampaignRequirementType,
  value?: number | null,
  valueMax?: number | null
): string {
  const unit = REQUIREMENT_UNITS[type];
  if (!unit) return type;
  if (unit.valueless || (value == null && valueMax == null)) return unit.label;

  const bound = (v: number) =>
    `${unit.prefix ?? ""}${numberFmt(v * (unit.scale ?? 1), unit.digits)}`;
  const tail = unitSuffix(unit, valueMax ?? value!);

  if (value != null && valueMax != null) {
    return `${bound(value)}-${bound(valueMax)}${tail}`;
  }
  if (type === "RANK") return `${bound(value ?? valueMax!)}${tail}`;
  if (type === "BOMB_HITS" && valueMax === 0) return "no bombs";
  if (value != null) return `≥ ${bound(value)}${tail}`;
  return `≤ ${bound(valueMax!)}${tail}`;
}

export function formatObjectives(
  objectives: CampaignCardObjective[],
  mode: CampaignTargetMode
): string {
  return objectives
    .map((o) => formatRequirement(o.type, o.value, o.valueMax))
    .join(mode === "OR" ? " or " : " and ");
}

export function formatElapsed(from?: string | null, to?: string | null): string | null {
  if (!from || !to) return null;
  const ms = Date.parse(to) - Date.parse(from);
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return plural(Math.max(1, mins), "minute");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return plural(hrs, "hour");
  const days = Math.floor(hrs / 24);
  if (days < 30) return plural(days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return plural(months, "month");
  return plural(Math.floor(days / 365), "year");
}

export async function renderCampaignCard(
  data: CampaignCardData
): Promise<CardResult> {
  const { user, campaign, milestone } = data;
  const accent = data.accentColor;
  const node = data.kind === "milestone" ? milestone?.node : undefined;
  const reward = data.kind === "milestone" ? milestone : { xp: campaign.completionXp, items: campaign.completionItems };

  const [{ ctx, finish }, art] = await Promise.all([
    openFeedCard({
      user,
      level: data.level,
      title: data.title,
      titleColor: accent,
      subtitle: data.subtitle,
      backdropUrl: milestone?.avatarUrl && node ? node.coverUrl : campaign.backgroundUrl,
    }),
    loadArt(data),
  ]);

  const elapsed = formatElapsed(data.progress?.startedAt, data.progress?.completedAt);
  const lines: Line[] = node
    ? [
        [{ text: node.songName, color: TEXT_PRIMARY }, { text: `by ${node.songAuthor}` }],
        [difficultySegment(node.difficulty), ...node.modifiers.map((text) => ({ text }))],
        [
          { text: "Needed", color: TEXT_TERTIARY },
          { text: formatObjectives(node.objectives, node.objectiveMode) },
          milestone?.userValue != null && { text: "Got", color: TEXT_TERTIARY },
          milestone?.userValue != null && { text: formatMeasure(node.objectives[0].type, milestone.userValue), color: accent },
        ],
      ]
    : [
        [
          data.kind === "completion" && { text: `${campaign.difficultyCount} maps` },
          elapsed != null && { text: `in ${elapsed}` },
          campaign.legacy && { text: "Legacy" },
          campaign.curated && !campaign.official && { text: "Curated" },
          campaign.loved && { text: "Loved", color: LOVED },
        ],
      ];

  let bottom = drawBody(ctx, {
    art: { ...art, icon: data.kind === "milestone" ? "flag" : "trophy", color: accent },
    artSize: 88,
    title: data.kind === "milestone" ? (milestone?.label ?? campaign.name) : campaign.name,
    description: data.kind === "completion" ? campaign.summary : null,
    lines: [
      ...lines,
      [
        !!reward?.xp && { text: `+${numberFmt(reward.xp, 0)} XP`, color: accent },
        ...(reward?.items ?? []).map((item) => ({
          text: item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
          color: TEXT_PRIMARY,
        })),
      ],
    ],
  });

  const total = data.progress?.total ?? 0;
  if (total > 0) {
    const completed = data.progress?.completed ?? 0;
    const label = `${numberFmt(completed, 0)} of ${numberFmt(total, 0)} maps`;
    bottom += 20;
    ctx.font = `600 12px ${SANS}`;
    const barW = FEED_RIGHT - FEED_LEFT - ctx.measureText(label).width - 16;
    drawLine(ctx, FEED_RIGHT, bottom, [{ text: label }], { size: 12, weight: 600, family: SANS, align: "right" });
    fillRoundRect(ctx, FEED_LEFT, bottom + 4, barW, 6, 3, BG_OVERLAY);
    const ratio = Math.min(1, completed / total);
    if (ratio > 0) fillRoundRect(ctx, FEED_LEFT, bottom + 4, Math.max(6, barW * ratio), 6, 3, accent);
    bottom += 14;
  }

  return {
    image: finish(bottom),
    profileUrl: playerUrl(user.id),
  };
}

async function loadArt(data: CampaignCardData): Promise<FeedArt> {
  if (data.kind === "milestone") {
    const checkpoint = await loadOptionalImage(data.milestone?.avatarUrl);
    if (checkpoint) return { img: checkpoint, fit: "contain" };
    const cover = await loadOptionalImage(data.milestone?.node?.coverUrl);
    if (cover) return { img: cover };
  }
  return { img: await loadOptionalImage(data.campaign.iconUrl), fit: "contain" };
}
