import type {
  CampaignDifficultyProgressResponse,
  CampaignDifficultyResponse,
  CampaignFeedFrame,
  CampaignProgressResponse,
} from "../types/api.js";
import type { CampaignFeedConfig } from "../types/config.js";
import { CATEGORY_HEX } from "../utils/canvas-utils.js";
import {
  formatElapsed,
  formatMeasure,
  formatObjectives,
  normalizeMilestoneLabel,
  type CampaignCardData,
  type CampaignCardItem,
  type CampaignCardObjective,
} from "../utils/campaign-card-renderer.js";
import { renderTemplate } from "../utils/templates.js";

export const NODE_COMPLETED = "node_completed";
export const CAMPAIGN_COMPLETED = "campaign_completed";

export const DEFAULT_IGNORED_LABELS = ["start"];

const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;

export type CampaignMilestoneRule = "seal" | "milestone";

export interface MilestoneCandidate {
  label: string;
  entry: CampaignDifficultyProgressResponse;
}

interface Snapshot {
  labels: Set<string>;
  expiresAt: number;
}

export class CampaignMilestoneTracker {
  private readonly snapshots = new Map<string, Snapshot>();

  candidates(
    userId: string,
    progress: CampaignProgressResponse,
    eventNodeId: string | undefined,
    ignoredLabels: Set<string>
  ): MilestoneCandidate[] {
    this.prune();

    const labelled = progress.difficulties.filter((d) => {
      const label = d.node.checkpointLabel?.trim();
      return !!label && !ignoredLabels.has(normalizeMilestoneLabel(label));
    });

    const earned = new Set<string>();
    for (const entry of labelled) {
      if (entry.pathCompleted) {
        earned.add(normalizeMilestoneLabel(entry.node.checkpointLabel!));
      }
    }

    const key = `${userId}:${progress.campaign.id}`;
    const previous = this.snapshots.get(key)?.labels;
    this.snapshots.set(key, {
      labels: earned,
      expiresAt: Date.now() + SNAPSHOT_TTL_MS,
    });

    let fresh: string[];
    if (previous) {
      fresh = [...earned].filter((label) => !previous.has(label));
    } else {
      const eventEntry = labelled.find(
        (d) => d.node.id === eventNodeId && d.pathCompleted
      );
      const eventLabel = eventEntry
        ? normalizeMilestoneLabel(eventEntry.node.checkpointLabel!)
        : null;
      fresh = eventLabel ? [eventLabel] : [];
    }

    return fresh
      .map((label) => {
        const matching = labelled.filter(
          (d) =>
            d.pathCompleted &&
            normalizeMilestoneLabel(d.node.checkpointLabel!) === label
        );
        const entry =
          matching.find((d) => d.node.id === eventNodeId) ?? matching[0];
        return entry ? { label: entry.node.checkpointLabel!.trim(), entry } : null;
      })
      .filter((c): c is MilestoneCandidate => c !== null);
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, snapshot] of this.snapshots) {
      if (snapshot.expiresAt < now) this.snapshots.delete(key);
    }
  }
}

export function milestoneRuleFor(
  frame: CampaignFeedFrame,
  label: string,
  cfg: CampaignFeedConfig
): CampaignMilestoneRule | null {
  const { sealMilestone, milestone } = cfg.rules;
  const normalized = normalizeMilestoneLabel(label);

  if (
    sealMilestone.enabled &&
    frame.campaign.slug === sealMilestone.campaignSlug &&
    sealMilestone.labels.some((l) => normalizeMilestoneLabel(l) === normalized)
  ) {
    return "seal";
  }

  if (milestone.enabled && frame.campaign.status === "CURATED") {
    return "milestone";
  }

  return null;
}

export function isEligibleForMilestones(
  frame: CampaignFeedFrame,
  cfg: CampaignFeedConfig
): boolean {
  const { sealMilestone, milestone } = cfg.rules;
  if (
    sealMilestone.enabled &&
    frame.campaign.slug === sealMilestone.campaignSlug
  ) {
    return true;
  }
  return milestone.enabled && frame.campaign.status === "CURATED";
}

export function needsProgressLookup(frame: CampaignFeedFrame): boolean {
  if (frame.node?.checkpointLabel?.trim()) return true;
  return frame.campaign.progressionAgnostic || frame.campaign.legacy;
}

export function isAnnounceableCompletion(
  frame: CampaignFeedFrame,
  cfg: CampaignFeedConfig
): boolean {
  if (!cfg.rules.completion.enabled) return false;
  return frame.campaign.status === "CURATED" || frame.campaign.official;
}

export function ignoredLabelSet(cfg: CampaignFeedConfig): Set<string> {
  const labels = cfg.rules.milestone.ignoredLabels ?? DEFAULT_IGNORED_LABELS;
  return new Set(labels.map(normalizeMilestoneLabel));
}

export interface CampaignCardExtras {
  level?: number;
  category?: { name: string; code: string };
  progress?: CampaignProgressResponse | null;
}

export function buildMilestoneCardData(
  frame: CampaignFeedFrame,
  candidate: MilestoneCandidate,
  rule: CampaignMilestoneRule,
  cfg: CampaignFeedConfig,
  extras: CampaignCardExtras
): CampaignCardData {
  const ruleCfg = rule === "seal" ? cfg.rules.sealMilestone : cfg.rules.milestone;
  const node = candidate.entry.node;
  const accent = accentColor(extras.category, node.checkpointColor, ruleCfg.color);
  const vars = templateVars(frame, extras, {
    milestoneLabel: candidate.label,
    milestoneXp: node.xp,
    node,
    userValue: candidate.entry.userValue,
  });

  return {
    kind: "milestone",
    user: userRef(frame),
    campaign: campaignRef(frame),
    milestone: {
      label: candidate.label,
      avatarUrl: node.checkpointAvatarUrl ?? null,
      xp: node.xp,
      items: itemRefs(node.items),
      node: {
        songName: node.songName,
        songAuthor: node.songAuthor,
        mapAuthor: node.mapAuthor,
        coverUrl: node.cdnCoverUrl ?? node.coverUrl ?? null,
        difficulty: node.difficulty,
        characteristic: node.characteristic,
        modifiers: nodeModifiers(node),
        objectives: nodeObjectives(node),
        objectiveMode: node.targetMode ?? "AND",
        complexity: node.complexity ?? null,
        nps: node.nps ?? null,
      },
      userValue: candidate.entry.userValue ?? null,
    },
    progress: progressRef(frame, extras.progress),
    title: renderTemplate(ruleCfg.messageTemplate, vars),
    subtitle: ruleCfg.subtitleTemplate
      ? renderTemplate(ruleCfg.subtitleTemplate, vars)
      : undefined,
    accentColor: accent,
    category: extras.category,
    level: extras.level,
  };
}

export function buildCompletionCardData(
  frame: CampaignFeedFrame,
  cfg: CampaignFeedConfig,
  extras: CampaignCardExtras
): CampaignCardData {
  const ruleCfg = cfg.rules.completion;
  const accent = accentColor(
    extras.category,
    frame.campaign.backgroundColor,
    ruleCfg.color
  );
  const vars = templateVars(frame, extras, {});

  return {
    kind: "completion",
    user: userRef(frame),
    campaign: campaignRef(frame),
    progress: progressRef(frame, extras.progress),
    title: renderTemplate(ruleCfg.messageTemplate, vars),
    subtitle: ruleCfg.subtitleTemplate
      ? renderTemplate(ruleCfg.subtitleTemplate, vars)
      : undefined,
    accentColor: accent,
    category: extras.category,
    level: extras.level,
  };
}

export function campaignCategoryId(
  frame: CampaignFeedFrame,
  node?: CampaignDifficultyResponse
): string | undefined {
  if (node?.categoryId) return node.categoryId;
  return frame.campaign.tags.find((t) => t.kind === "CATEGORY")?.categoryId;
}

function userRef(frame: CampaignFeedFrame): CampaignCardData["user"] {
  const player = frame.player!;
  return {
    id: player.userId,
    name: player.userName,
    country: player.country ?? null,
    avatarUrl: player.cdnAvatarUrl ?? player.avatarUrl ?? null,
  };
}

function campaignRef(frame: CampaignFeedFrame): CampaignCardData["campaign"] {
  const campaign = frame.campaign;
  return {
    name: campaign.name,
    slug: campaign.slug,
    summary: campaign.summary ?? null,
    iconUrl: campaign.iconUrl ?? null,
    backgroundUrl: campaign.backgroundUrl ?? null,
    difficultyCount: campaign.difficultyCount,
    completionXp: campaign.completionXp,
    completionItems: itemRefs(campaign.completionItems),
    official: campaign.official,
    legacy: campaign.legacy,
    curated: campaign.status === "CURATED",
    loved: campaign.loved ?? false,
  };
}

function nodeModifiers(node: CampaignDifficultyResponse): string[] {
  return (node.modifiers ?? [])
    .filter((m) => m.requirement === "REQUIRED")
    .map((m) => (m.modifier.code || m.modifier.name || "").toUpperCase())
    .filter((code) => code.length > 0);
}

function nodeObjectives(node: CampaignDifficultyResponse): CampaignCardObjective[] {
  if (node.targets?.length) {
    return node.targets.map((t) => ({
      type: t.requirementType,
      value: t.requirementValue ?? null,
      valueMax: t.requirementValueMax ?? null,
    }));
  }

  return [
    {
      type: node.requirementType,
      value: node.requirementValue ?? null,
      valueMax: node.requirementValueMax ?? null,
    },
  ];
}

function progressRef(
  frame: CampaignFeedFrame,
  progress: CampaignProgressResponse | null | undefined
): CampaignCardData["progress"] {
  if (!progress) return undefined;

  return {
    completed: progress.completedDifficulties,
    total: frame.campaign.difficultyCount,
    startedAt: progress.startedAt ?? null,
    completedAt: progress.completedAt ?? frame.completedAt,
  };
}

function itemRefs(items: { itemName: string; quantity: number }[]): CampaignCardItem[] {
  return items.map((i) => ({ name: i.itemName, quantity: i.quantity }));
}

function accentColor(
  category: { code: string } | undefined,
  nodeColor: string | undefined,
  fallback: string
): string {
  if (category && CATEGORY_HEX[category.code]) return CATEGORY_HEX[category.code];
  if (nodeColor && /^#[0-9a-fA-F]{6}$/.test(nodeColor.trim())) return nodeColor.trim();
  return fallback;
}

interface MilestoneVars {
  milestoneLabel?: string;
  milestoneXp?: number;
  node?: CampaignDifficultyResponse;
  userValue?: number | null;
}

function templateVars(
  frame: CampaignFeedFrame,
  extras: CampaignCardExtras,
  milestone: MilestoneVars
): Record<string, string | number> {
  const campaign = frame.campaign;
  const progress = extras.progress;
  const completed =
    progress?.completedDifficulties ??
    (frame.type === CAMPAIGN_COMPLETED ? campaign.difficultyCount : 0);
  const elapsed = formatElapsed(
    progress?.startedAt,
    progress?.completedAt ?? frame.completedAt
  );

  return {
    playerName: frame.player?.userName ?? "",
    campaignName: campaign.name,
    creatorName: campaign.creatorAlias || campaign.creatorName,
    campaignXp: campaign.completionXp,
    mapsCompleted: completed,
    mapsTotal: campaign.difficultyCount,
    categoryName: extras.category?.name ?? "",
    milestoneLabel: milestone.milestoneLabel ?? "",
    milestoneXp: milestone.milestoneXp ?? 0,
    songName: milestone.node?.songName ?? "",
    songAuthor: milestone.node?.songAuthor ?? "",
    requirement: milestone.node
      ? formatObjectives(
          nodeObjectives(milestone.node),
          milestone.node.targetMode ?? "AND"
        )
      : "",
    achieved:
      milestone.node && milestone.userValue != null
        ? formatMeasure(
            nodeObjectives(milestone.node)[0].type,
            milestone.userValue
          )
        : "",
    elapsed: elapsed ?? "",
  };
}
