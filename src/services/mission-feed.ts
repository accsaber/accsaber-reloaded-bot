import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from "discord.js";
import { getCategoryCodeById, getCategoryNameById } from "../api/categories.js";
import { getUserLevel } from "../api/users.js";
import { config } from "../config.js";
import type { MissionCompletedPayload } from "../types/api.js";
import type { MissionFeedConfig } from "../types/config.js";
import {
  renderMissionCard,
  type MissionCardData,
} from "../utils/mission-card-renderer.js";
import { renderTemplate } from "../utils/templates.js";

const DEFAULT_MAX_AGE_SEC = 600;
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

interface DedupeEntry {
  expiresAt: number;
}

export class MissionFeed {
  private readonly client: Client;
  private readonly cfg: MissionFeedConfig;
  private channel: TextChannel | null = null;
  private readonly dedupe = new Map<string, DedupeEntry>();
  private readonly allowedBands: Set<string>;

  constructor(client: Client) {
    this.client = client;
    this.cfg = config.missionFeed!;
    this.allowedBands = new Set(this.cfg.bands.map((b) => b.toLowerCase()));
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

  async handlePayload(payload: MissionCompletedPayload): Promise<void> {
    if (!this.cfg.enabled) return;

    const band = payload.band?.toLowerCase();
    if (!band || !this.allowedBands.has(band)) return;

    const maxAgeSec = this.cfg.maxCompletedAgeSeconds ?? DEFAULT_MAX_AGE_SEC;
    const completedAtMs = Date.parse(payload.completedAt);
    if (Number.isFinite(completedAtMs)) {
      const ageSec = (Date.now() - completedAtMs) / 1000;
      if (ageSec > maxAgeSec) {
        console.log(
          `[MissionFeed] Dropping stale payload (age=${Math.round(ageSec)}s) for user ${payload.userName}`
        );
        return;
      }
    }

    this.pruneDedupe();

    const dedupeKey = `${payload.userId}:${payload.missionId}`;
    if (this.dedupe.has(dedupeKey)) return;
    this.dedupe.set(dedupeKey, { expiresAt: Date.now() + DEDUPE_TTL_MS });

    const card = await this.buildCard(payload).catch((err) => {
      console.error("[MissionFeed] Card build failed:", err);
      return null;
    });
    if (!card) return;

    try {
      const channel = await this.getChannel();
      if (!channel) {
        console.error("[MissionFeed] Could not resolve channel", this.cfg.channelId);
        return;
      }

      const result = await renderMissionCard(card);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Profile")
          .setStyle(ButtonStyle.Link)
          .setURL(result.profileUrl)
      );

      await channel.send({
        files: [new AttachmentBuilder(result.image, { name: "mission-feed.png" })],
        components: [row],
      });
    } catch (err) {
      console.error("[MissionFeed] Failed to send:", err);
    }
  }

  private async buildCard(
    payload: MissionCompletedPayload
  ): Promise<MissionCardData> {
    const [levelResult, categoryResult] = await Promise.allSettled([
      getUserLevel(payload.userId),
      payload.categoryId ? resolveCategory(payload.categoryId) : Promise.resolve(undefined),
    ]);

    const level = levelResult.status === "fulfilled" ? levelResult.value.level : undefined;
    const category =
      categoryResult.status === "fulfilled" ? categoryResult.value : undefined;

    const title = renderTemplate(this.cfg.messageTemplate, {
      playerName: payload.userName,
      pool: payload.pool,
      band: payload.band,
      missionType: payload.type,
      missionName: payload.templateName,
      categoryName: category?.name ?? "",
    });

    return {
      user: {
        id: payload.userId,
        name: payload.userName,
        country: payload.userCountry,
        avatarUrl: payload.userAvatarUrl,
      },
      mission: {
        id: payload.missionId,
        name: payload.templateName,
        description: payload.templateDescription,
        type: payload.type,
        pool: payload.pool,
        band: payload.band,
        xpAwarded: payload.xpAwarded,
      },
      title,
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
