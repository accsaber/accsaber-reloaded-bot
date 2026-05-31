import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from "discord.js";
import { getCategoryCodeById, getCategoryNameById } from "../api/categories.js";
import {
  configureCompletionStatsCache,
  getCompletionStatsById,
  getMilestoneHolders,
} from "../api/milestones.js";
import { getUserLevel } from "../api/users.js";
import { config } from "../config.js";
import type {
  MilestoneCompletedPayload,
  MilestonePayloadEntry,
  MilestoneTier,
} from "../types/api.js";
import type { MilestoneFeedConfig } from "../types/config.js";
import {
  renderMilestoneCard,
  type MilestoneCardData,
  type MilestoneTriggerKind,
} from "../utils/milestone-card-renderer.js";
import { renderTemplate } from "../utils/templates.js";

const TIER_RANK: Record<MilestoneTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
  apex: 5,
};

const DEFAULT_MAX_PAYLOAD = 5;
const DEFAULT_MAX_AGE_SEC = 600;
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

interface DedupeEntry {
  expiresAt: number;
}

interface TriggerResult {
  kind: MilestoneTriggerKind;
  title: string;
  subtitle?: string;
  color: string;
}

export class MilestoneFeed {
  private readonly client: Client;
  private readonly cfg: MilestoneFeedConfig;
  private channel: TextChannel | null = null;
  private readonly dedupe = new Map<string, DedupeEntry>();

  constructor(client: Client) {
    this.client = client;
    this.cfg = config.milestoneFeed!;
    configureCompletionStatsCache(this.cfg.completionStatsTtlSeconds * 1000);
  }

  private async getChannel(): Promise<TextChannel | null> {
    if (this.channel) return this.channel;

    const ch = await this.client.channels.fetch(this.cfg.channelId);
    if (ch?.isTextBased()) {
      this.channel = ch as TextChannel;
      return this.channel;
    }
    return null;
  }

  async handlePayload(payload: MilestoneCompletedPayload): Promise<void> {
    if (!this.cfg.enabled) return;

    const milestones = payload.milestones ?? [];
    if (milestones.length === 0) return;

    const maxPayload = this.cfg.maxMilestonesPerPayload ?? DEFAULT_MAX_PAYLOAD;
    if (milestones.length > maxPayload) {
      console.log(
        `[MilestoneFeed] Dropping backfill-shaped payload (milestones=${milestones.length}) for user ${payload.userName}`
      );
      return;
    }

    const maxAgeSec = this.cfg.maxCompletedAgeSeconds ?? DEFAULT_MAX_AGE_SEC;
    const completedAtMs = Date.parse(payload.completedAt);
    if (Number.isFinite(completedAtMs)) {
      const ageSec = (Date.now() - completedAtMs) / 1000;
      if (ageSec > maxAgeSec) {
        console.log(
          `[MilestoneFeed] Dropping stale payload (age=${Math.round(ageSec)}s) for user ${payload.userName}`
        );
        return;
      }
    }

    this.pruneDedupe();

    const cards: MilestoneCardData[] = [];

    for (const milestone of milestones) {
      let trigger: TriggerResult | null = null;

      let firstFired = false;
      if (this.cfg.rules.firstCompletion.enabled) {
        const result = await this.checkFirstCompletion(payload, milestone).catch((err) => {
          console.error("[MilestoneFeed] Trigger check failed:", err);
          return null;
        });
        if (result) {
          trigger = result;
          firstFired = true;
        }
      }

      let rareFired = false;
      if (!firstFired && this.cfg.rules.rare.enabled) {
        const result = await this.checkRare(payload, milestone).catch((err) => {
          console.error("[MilestoneFeed] Trigger check failed:", err);
          return null;
        });
        if (result) {
          trigger = result;
          rareFired = true;
        }
      }

      if (!firstFired && !rareFired && this.cfg.rules.diamondPlus.enabled) {
        const result = this.checkDiamondPlus(payload, milestone);
        if (result) trigger = result;
      }

      if (!trigger) continue;

      const dedupeKey = `${payload.userId}:${milestone.id}`;
      if (this.dedupe.has(dedupeKey)) continue;
      this.dedupe.set(dedupeKey, { expiresAt: Date.now() + DEDUPE_TTL_MS });

      const card = await this.buildCard(payload, milestone, trigger).catch((err) => {
        console.error("[MilestoneFeed] Card build failed:", err);
        return null;
      });
      if (card) cards.push(card);
    }

    if (cards.length === 0) return;

    try {
      const channel = await this.getChannel();
      if (!channel) {
        console.error("[MilestoneFeed] Could not resolve channel", this.cfg.channelId);
        return;
      }
      for (const card of cards) {
        const result = await renderMilestoneCard(card);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Profile")
            .setStyle(ButtonStyle.Link)
            .setURL(result.profileUrl)
        );

        await channel.send({
          files: [new AttachmentBuilder(result.image, { name: "milestone-feed.png" })],
          components: [row],
        });
      }
    } catch (err) {
      console.error("[MilestoneFeed] Failed to send:", err);
    }
  }

  private async checkFirstCompletion(
    payload: MilestoneCompletedPayload,
    milestone: MilestonePayloadEntry
  ): Promise<TriggerResult | null> {
    const { firstCompletion } = this.cfg.rules;

    const holders = await getMilestoneHolders(milestone.id, {
      page: 0,
      size: 1,
      sort: "completedAt,asc",
    });
    if (
      holders.totalElements !== 1 ||
      holders.content[0]?.userId !== payload.userId
    ) {
      return null;
    }

    const vars = {
      milestoneType: milestone.type,
      tier: milestone.tier,
      playerName: payload.userName,
    };
    return {
      kind: "first",
      title: renderTemplate(firstCompletion.messageTemplate, vars),
      color: firstCompletion.color,
    };
  }

  private async checkRare(
    payload: MilestoneCompletedPayload,
    milestone: MilestonePayloadEntry
  ): Promise<TriggerResult | null> {
    const { rare } = this.cfg.rules;

    const stats = await getCompletionStatsById(milestone.id);
    if (
      !stats ||
      stats.totalPlayers < rare.minPlayersToCount ||
      stats.completionPercentage >= rare.percentageThreshold
    ) {
      return null;
    }

    const vars = {
      milestoneType: milestone.type,
      tier: milestone.tier,
      playerName: payload.userName,
      percentage: stats.completionPercentage.toFixed(2),
    };
    return {
      kind: "rare",
      title: renderTemplate(rare.messageTemplate, vars),
      subtitle: renderTemplate(rare.subtitleTemplate, vars),
      color: rare.color,
    };
  }

  private checkDiamondPlus(
    payload: MilestoneCompletedPayload,
    milestone: MilestonePayloadEntry
  ): TriggerResult | null {
    const { diamondPlus } = this.cfg.rules;
    if (!diamondPlus.tiers.includes(milestone.tier)) return null;

    const vars = {
      milestoneType: milestone.type,
      tier: milestone.tier,
      playerName: payload.userName,
    };
    return {
      kind: "diamond_plus",
      title: renderTemplate(diamondPlus.messageTemplate, vars),
      color: diamondPlus.color,
    };
  }

  private async buildCard(
    payload: MilestoneCompletedPayload,
    milestone: MilestonePayloadEntry,
    trigger: TriggerResult
  ): Promise<MilestoneCardData> {
    const [levelResult, categoryResult] = await Promise.allSettled([
      getUserLevel(payload.userId),
      milestone.categoryId ? resolveCategory(milestone.categoryId) : Promise.resolve(undefined),
    ]);

    const level = levelResult.status === "fulfilled" ? levelResult.value.level : undefined;
    const category =
      categoryResult.status === "fulfilled" ? categoryResult.value : undefined;

    return {
      user: {
        id: payload.userId,
        name: payload.userName,
        country: payload.userCountry,
        avatarUrl: payload.userAvatarUrl,
      },
      milestone: {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        type: milestone.type,
        tier: milestone.tier,
        xp: milestone.xp,
        categoryId: milestone.categoryId ?? undefined,
      },
      trigger: trigger.kind,
      title: trigger.title,
      subtitle: trigger.subtitle,
      accentColor: trigger.color,
      category,
      level,
    };
  }

  private pruneDedupe(): void {
    const now = Date.now();
    for (const [key, entry] of this.dedupe) {
      if (entry.expiresAt < now) this.dedupe.delete(key);
    }
  }

  static tierRank(tier: MilestoneTier): number {
    return TIER_RANK[tier];
  }
}

async function resolveCategory(
  categoryId: string
): Promise<{ name: string; code: string } | undefined> {
  const [code, name] = await Promise.all([
    getCategoryCodeById(categoryId),
    getCategoryNameById(categoryId),
  ]);
  if (!code || !name) return undefined;
  return { code, name };
}
