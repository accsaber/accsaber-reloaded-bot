import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from "discord.js";
import { getCampaignProgress } from "../api/campaigns.js";
import { getCategoryCodeById, getCategoryNameById } from "../api/categories.js";
import { getUserLevel } from "../api/users.js";
import { config } from "../config.js";
import type {
  CampaignFeedFrame,
  CampaignProgressResponse,
} from "../types/api.js";
import type { CampaignFeedConfig } from "../types/config.js";
import {
  renderCampaignCard,
  type CampaignCardData,
} from "../utils/campaign-card-renderer.js";
import {
  CAMPAIGN_COMPLETED,
  CampaignMilestoneTracker,
  NODE_COMPLETED,
  buildCompletionCardData,
  buildMilestoneCardData,
  campaignCategoryId,
  ignoredLabelSet,
  isAnnounceableCompletion,
  isEligibleForMilestones,
  milestoneRuleFor,
  needsProgressLookup,
  type MilestoneCandidate,
} from "./campaign-rules.js";

const DEFAULT_MAX_AGE_SEC = 600;
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

interface DedupeEntry {
  expiresAt: number;
}

export class CampaignFeed {
  private readonly client: Client;
  private readonly cfg: CampaignFeedConfig;
  private channel: TextChannel | null = null;
  private readonly dedupe = new Map<string, DedupeEntry>();
  private readonly tracker = new CampaignMilestoneTracker();

  constructor(client: Client) {
    this.client = client;
    this.cfg = config.campaignFeed!;
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

  async handleFrame(frame: CampaignFeedFrame): Promise<void> {
    if (!this.cfg.enabled) return;
    if (!frame.player) return;

    const maxAgeSec = this.cfg.maxCompletedAgeSeconds ?? DEFAULT_MAX_AGE_SEC;
    const completedAtMs = Date.parse(frame.completedAt);
    if (Number.isFinite(completedAtMs)) {
      const ageSec = (Date.now() - completedAtMs) / 1000;
      if (ageSec > maxAgeSec) {
        console.log(
          `[CampaignFeed] Dropping stale ${frame.type} (age=${Math.round(ageSec)}s) for user ${frame.player.userName}`
        );
        return;
      }
    }

    this.pruneDedupe();

    if (frame.type === NODE_COMPLETED) {
      await this.handleNodeCompleted(frame);
      return;
    }
    if (frame.type === CAMPAIGN_COMPLETED) {
      await this.handleCampaignCompleted(frame);
    }
  }

  private async handleNodeCompleted(frame: CampaignFeedFrame): Promise<void> {
    if (!isEligibleForMilestones(frame, this.cfg)) return;
    if (!needsProgressLookup(frame)) return;

    const progress = await this.fetchProgress(frame);
    if (!progress) return;

    const candidates = this.tracker.candidates(
      frame.player!.userId,
      progress,
      frame.node?.id,
      ignoredLabelSet(this.cfg)
    );
    if (candidates.length === 0) return;

    for (const candidate of candidates) {
      await this.postMilestone(frame, candidate, progress);
    }
  }

  private async postMilestone(
    frame: CampaignFeedFrame,
    candidate: MilestoneCandidate,
    progress: CampaignProgressResponse
  ): Promise<void> {
    const rule = milestoneRuleFor(frame, candidate.label, this.cfg);
    if (!rule) return;

    const dedupeKey = `${frame.player!.userId}:${frame.campaign.id}:${candidate.label.toLowerCase()}`;
    if (this.dedupe.has(dedupeKey)) return;
    this.dedupe.set(dedupeKey, { expiresAt: Date.now() + DEDUPE_TTL_MS });

    const [level, category] = await Promise.all([
      this.resolveLevel(frame),
      this.resolveCategory(campaignCategoryId(frame, candidate.entry.node)),
    ]);

    const card = buildMilestoneCardData(frame, candidate, rule, this.cfg, {
      level,
      category,
      progress,
    });

    await this.send(card, "campaign-milestone.png");
  }

  private async handleCampaignCompleted(frame: CampaignFeedFrame): Promise<void> {
    if (!isAnnounceableCompletion(frame, this.cfg)) return;

    const dedupeKey = `${frame.player!.userId}:${frame.campaign.id}:complete`;
    if (this.dedupe.has(dedupeKey)) return;
    this.dedupe.set(dedupeKey, { expiresAt: Date.now() + DEDUPE_TTL_MS });

    const [progress, level, category] = await Promise.all([
      this.fetchProgress(frame),
      this.resolveLevel(frame),
      this.resolveCategory(campaignCategoryId(frame)),
    ]);

    const card = buildCompletionCardData(frame, this.cfg, {
      level,
      category,
      progress,
    });

    await this.send(card, "campaign-complete.png");
  }

  private async send(card: CampaignCardData, fileName: string): Promise<void> {
    try {
      const channel = await this.getChannel();
      if (!channel) {
        console.error("[CampaignFeed] Could not resolve channel", this.cfg.channelId);
        return;
      }

      const result = await renderCampaignCard(card);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Campaign")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://accsaber.com/campaigns/${card.campaign.slug}`),
        new ButtonBuilder()
          .setLabel("Profile")
          .setStyle(ButtonStyle.Link)
          .setURL(result.profileUrl)
      );

      await channel.send({
        files: [new AttachmentBuilder(result.image, { name: fileName })],
        components: [row],
      });
    } catch (err) {
      console.error("[CampaignFeed] Failed to send:", err);
    }
  }

  private async fetchProgress(
    frame: CampaignFeedFrame
  ): Promise<CampaignProgressResponse | null> {
    try {
      return await getCampaignProgress(frame.campaign.slug, frame.player!.userId);
    } catch (err) {
      console.error(
        `[CampaignFeed] Failed to fetch progress for ${frame.campaign.slug}:`,
        err
      );
      return null;
    }
  }

  private async resolveLevel(
    frame: CampaignFeedFrame
  ): Promise<number | undefined> {
    return getUserLevel(frame.player!.userId)
      .then((res) => res.level)
      .catch(() => undefined);
  }

  private async resolveCategory(
    categoryId: string | undefined
  ): Promise<{ name: string; code: string } | undefined> {
    if (!categoryId) return undefined;
    try {
      const [code, name] = await Promise.all([
        getCategoryCodeById(categoryId),
        getCategoryNameById(categoryId),
      ]);
      if (!code || !name) return undefined;
      return { code, name };
    } catch {
      return undefined;
    }
  }

  private pruneDedupe(): void {
    const now = Date.now();
    for (const [key, entry] of this.dedupe) {
      if (entry.expiresAt < now) this.dedupe.delete(key);
    }
  }
}
