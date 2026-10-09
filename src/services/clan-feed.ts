import { EmbedBuilder, escapeMarkdown, type Client, type TextChannel } from "discord.js";
import { config } from "../config.js";
import type {
  ClanArena,
  ClanFeedFrame,
  ClanRuleset,
  ClanSeasonClosedResponse,
  ClanWarHitResponse,
  ClanWarResponse,
  PublicClanResponse,
} from "../types/api.js";
import { formatDifficulty } from "../utils/canvas-utils.js";
import { Colors, WEBSITE_URL } from "../utils/embeds.js";
import { feedChannel } from "./feed.js";

const CLAN_FEED_TYPES = new Set<string>([
  "war_declared",
  "war_ended",
  "war_break",
  "clan_founded",
  "alliance_formed",
  "alliance_ended",
  "rival_declared",
  "season_closed",
]);

const ARENA_LABEL: Record<ClanArena, string> = {
  mixed: "Mixed",
  random: "Random",
  category_turf: "Category Turf",
  complexity_turf: "Complexity Turf",
};

const RULESET_LABEL: Record<ClanRuleset, string> = {
  duel: "Duel",
  berserker: "Berserker",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export function parseClanFrame(raw: unknown): ClanFeedFrame | null {
  const frame = raw as ClanFeedFrame | null;
  return frame && CLAN_FEED_TYPES.has(frame.type) && frame.data ? frame : null;
}

function whole(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function tag(clan: PublicClanResponse): string {
  return `[${escapeMarkdown(clan.tag)}]`;
}

function clanUrl(clan: PublicClanResponse): string {
  return `${WEBSITE_URL}/clans/${encodeURIComponent(clan.slug)}`;
}

function clanLink(clan: PublicClanResponse): string {
  const name = escapeMarkdown(clan.name).replace(/[[\]]/g, "\\$&");
  return `${tag(clan)} [${name}](${clanUrl(clan)})`;
}

function warUrl(warId: string): string {
  return `${WEBSITE_URL}/clans/wars/${encodeURIComponent(warId)}`;
}

function clanColor(clan: PublicClanResponse | null | undefined): number {
  for (const hex of [clan?.primaryColor, clan?.tagColor]) {
    if (hex && /^#?[0-9a-f]{6}$/i.test(hex)) return parseInt(hex.replace("#", ""), 16);
  }
  return Colors.category.overall;
}

function clanEmbed(clan: PublicClanResponse | null | undefined): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(clanColor(clan));
  if (clan?.iconUrl) embed.setThumbnail(clan.iconUrl);
  return embed;
}

function warDeclared(war: ClanWarResponse, warId: string): EmbedBuilder {
  const { attacker, defender } = war;
  return clanEmbed(attacker.clan)
    .setTitle(`${tag(attacker.clan)} declares war on ${tag(defender.clan)}`)
    .setURL(warUrl(warId))
    .setDescription(`${clanLink(attacker.clan)} vs ${clanLink(defender.clan)}`)
    .addFields(
      { name: "Arena", value: ARENA_LABEL[war.arena] ?? war.arena, inline: true },
      { name: "Ruleset", value: RULESET_LABEL[war.ruleset] ?? war.ruleset, inline: true },
      { name: "Stake", value: `\`${whole(attacker.stake)}\``, inline: true },
      {
        name: "Declared by",
        value: escapeMarkdown(war.declaredBy?.name ?? "Unknown"),
        inline: true,
      }
    );
}

function warEnded(war: ClanWarResponse, warId: string): EmbedBuilder {
  const { attacker, defender } = war;
  const atk = tag(attacker.clan);
  const def = tag(defender.clan);

  const [title, winner]: [string, PublicClanResponse | null] = (() => {
    switch (war.outcome) {
      case "attacker_won":
        return [`${atk} defeats ${def}`, attacker.clan];
      case "defender_won":
        return [`${def} holds the line against ${atk}`, defender.clan];
      case "drawn":
        return ["War ends in a draw", null];
      case "retreated":
        return [`${atk} retreats from ${def}`, null];
      case "forfeited":
        return ["War ends in a forfeit", null];
      case "season_ended":
        return ["War called at season end", null];
      default:
        return [`${atk} vs ${def} is over`, null];
    }
  })();

  const embed = winner ? clanEmbed(winner) : new EmbedBuilder().setColor(Colors.semantic.neutral);
  return embed
    .setTitle(title)
    .setURL(warUrl(warId))
    .setDescription(
      [
        `${clanLink(attacker.clan)}: \`${whole(attacker.stakeRemaining)}\` stake left`,
        `${clanLink(defender.clan)}: \`${whole(defender.stakeRemaining)}\` stake left`,
      ].join("\n")
    );
}

function warBreak(hit: ClanWarHitResponse, warId: string): EmbedBuilder {
  const { attacker, victim, difficulty } = hit;
  const embed = clanEmbed(attacker.clan)
    .setTitle(`${escapeMarkdown(attacker.name)} broke ${escapeMarkdown(victim.name)}'s guard`)
    .setURL(warUrl(warId));

  const cover = difficulty?.cdnCoverUrl ?? difficulty?.coverUrl;
  if (cover) embed.setThumbnail(cover);

  const lines: string[] = [];
  if (attacker.clan && victim.clan) {
    lines.push(`${clanLink(attacker.clan)} vs ${clanLink(victim.clan)}`);
  }
  if (difficulty) {
    lines.push(`${escapeMarkdown(difficulty.songName)} · ${formatDifficulty(difficulty.difficulty)}`);
  }
  lines.push(`Standing moved: \`${whole(hit.standingMoved)}\``);
  return embed.setDescription(lines.join("\n"));
}

function seasonClosed(closed: ClanSeasonClosedResponse): EmbedBuilder {
  const top = [...closed.top].sort((a, b) => a.rank - b.rank).slice(0, 3);
  const embed = new EmbedBuilder()
    .setColor(Colors.milestoneTier.gold)
    .setTitle(`${escapeMarkdown(closed.season.name)} is over`)
    .setURL(`${WEBSITE_URL}/clans/seasons/${encodeURIComponent(closed.season.slug)}`)
    .setDescription(
      top
        .map(
          (s) =>
            `${MEDALS[s.rank - 1] ?? `#${s.rank}`} ${clanLink(s.clan)} - \`${whole(s.standing)}\` standing`
        )
        .join("\n") || "No clans placed this season."
    );
  if (top[0]?.clan.iconUrl) embed.setThumbnail(top[0].clan.iconUrl);
  return embed;
}

export function buildClanEmbed(frame: ClanFeedFrame): EmbedBuilder {
  switch (frame.type) {
    case "war_declared":
      return warDeclared(frame.data, frame.warId);
    case "war_ended":
      return warEnded(frame.data, frame.warId);
    case "war_break":
      return warBreak(frame.data, frame.warId);
    case "clan_founded": {
      const [clan] = frame.data;
      return clanEmbed(clan)
        .setTitle(`A new clan rises: ${tag(clan)} ${escapeMarkdown(clan.name)}`)
        .setURL(clanUrl(clan));
    }
    case "alliance_formed":
    case "alliance_ended": {
      const [a, b] = frame.data;
      const verb = frame.type === "alliance_formed" ? "are now allies" : "have parted ways";
      return clanEmbed(a)
        .setTitle(`${tag(a)} and ${tag(b)} ${verb}`)
        .setDescription(`${clanLink(a)} & ${clanLink(b)}`);
    }
    case "rival_declared": {
      const [a, b] = frame.data;
      return clanEmbed(a)
        .setTitle(`${tag(a)} calls out ${tag(b)} as a rival`)
        .setDescription(`${clanLink(a)} vs ${clanLink(b)}`);
    }
    case "season_closed":
      return seasonClosed(frame.data);
  }
}

export class ClanFeed {
  private readonly getChannel: () => Promise<TextChannel | null>;

  constructor(client: Client) {
    this.getChannel = feedChannel(client, config.clanFeed!.channelId);
  }

  async handleFrame(frame: ClanFeedFrame): Promise<void> {
    if (config.clanFeed!.skipTypes?.includes(frame.type)) return;
    const embed = buildClanEmbed(frame);
    const channel = await this.getChannel();
    if (!channel) {
      console.error("[ClanFeed] Could not resolve channel", config.clanFeed!.channelId);
      return;
    }
    await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
  }
}
