import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from "discord.js";
import { getUserLevel } from "../api/users.js";
import { config } from "../config.js";
import { feedChannel } from "./feed.js";
import type { CrateFeedFrame } from "../types/api.js";
import type { CrateFeedConfig } from "../types/config.js";
import { rarityLabel, renderCrateCard, type CrateCardData } from "../utils/crate-card-renderer.js";
import { buildCrateCardData, isNoteworthyOpen } from "./crate-rules.js";
import { feedSearchLine } from "../utils/templates.js";

const DEFAULT_MAX_AGE_SEC = 600;
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

interface DedupeEntry {
  expiresAt: number;
}

export class CrateFeed {
  private readonly cfg: CrateFeedConfig;
  private readonly getChannel: () => Promise<TextChannel | null>;
  private readonly dedupe = new Map<string, DedupeEntry>();

  constructor(client: Client) {
    this.cfg = config.crateFeed!;
    this.getChannel = feedChannel(client, this.cfg.channelId);
  }

  async handleFrame(frame: CrateFeedFrame): Promise<void> {
    if (!this.cfg.enabled) return;

    const { player, open } = frame;

    if (!isNoteworthyOpen(frame, this.cfg)) return;

    const maxAgeSec = this.cfg.maxOpenAgeSeconds ?? DEFAULT_MAX_AGE_SEC;
    const rolledAtMs = Date.parse(open.rolledAt);
    if (Number.isFinite(rolledAtMs)) {
      const ageSec = (Date.now() - rolledAtMs) / 1000;
      if (ageSec > maxAgeSec) {
        console.log(
          `[CrateFeed] Dropping stale open (age=${Math.round(ageSec)}s) for user ${player.name}`
        );
        return;
      }
    }

    this.pruneDedupe();

    const dedupeKey = open.id;
    if (this.dedupe.has(dedupeKey)) return;
    this.dedupe.set(dedupeKey, { expiresAt: Date.now() + DEDUPE_TTL_MS });

    const card = await this.buildCard(frame).catch((err) => {
      console.error("[CrateFeed] Card build failed:", err);
      return null;
    });
    if (!card) return;

    try {
      const channel = await this.getChannel();
      if (!channel) {
        console.error("[CrateFeed] Could not resolve channel", this.cfg.channelId);
        return;
      }

      const result = await renderCrateCard(card);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Profile")
          .setStyle(ButtonStyle.Link)
          .setURL(result.profileUrl)
      );

      await channel.send({
        content: feedSearchLine(
          [card.user.name],
          [card.crate.name, card.reward.name, rarityLabel(card.reward.rarity)],
          card.reward.modifiers.map((m) => m.name),
          [card.reward.unusualEffect?.name]
        ),
        allowedMentions: { parse: [] },
        files: [new AttachmentBuilder(result.image, { name: "crate-feed.png" })],
        components: [row],
      });
    } catch (err) {
      console.error("[CrateFeed] Failed to send:", err);
    }
  }

  private async buildCard(frame: CrateFeedFrame): Promise<CrateCardData> {
    const level = await getUserLevel(frame.player.id)
      .then((res) => res.level)
      .catch(() => undefined);

    return buildCrateCardData(frame, this.cfg, level);
  }

  private pruneDedupe(): void {
    const now = Date.now();
    for (const [key, entry] of this.dedupe) {
      if (entry.expiresAt < now) this.dedupe.delete(key);
    }
  }
}
