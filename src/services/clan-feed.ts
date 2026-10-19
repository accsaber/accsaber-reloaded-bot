import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from "discord.js";
import { config } from "../config.js";
import type {
  ClanArena,
  ClanFeedFrame,
  ClanRuleset,
  ClanSeasonClosedResponse,
  ClanWarHitResponse,
  ClanWarResponse,
  ClanWarTeamResponse,
  PlayerRef,
  PublicClanResponse,
} from "../types/api.js";
import { CATEGORY_HEX, formatDifficulty } from "../utils/canvas-utils.js";
import { renderClanCard, type ClanCardData } from "../utils/clan-card-renderer.js";
import { WEBSITE_URL } from "../utils/embeds.js";
import { feedSearchLine } from "../utils/templates.js";
import { feedChannel } from "./feed.js";

export interface ClanPost {
  card: ClanCardData;
  link: { label: string; url: string };
}

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

const NEUTRAL = "#6b7280";
const GOLD = "#ffd700";

export function parseClanFrame(raw: unknown): ClanFeedFrame | null {
  const frame = raw as ClanFeedFrame | null;
  return frame && CLAN_FEED_TYPES.has(frame.type) && frame.data ? frame : null;
}

function whole(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function tag(clan: PublicClanResponse): string {
  return `[${clan.tag}]`;
}

function clanUrl(clan: PublicClanResponse): string {
  return `${WEBSITE_URL}/clans/${encodeURIComponent(clan.slug)}`;
}

function warUrl(warId: string): string {
  return `${WEBSITE_URL}/clans/wars/${encodeURIComponent(warId)}`;
}

function clanColor(clan: PublicClanResponse | null | undefined): string {
  for (const hex of [clan?.primaryColor, clan?.tagColor]) {
    if (hex && /^#?[0-9a-f]{6}$/i.test(hex)) return hex.startsWith("#") ? hex : `#${hex}`;
  }
  return CATEGORY_HEX.overall;
}

function clanHeader(clan: PublicClanResponse): Pick<ClanCardData, "header" | "bannerUrl"> {
  return { header: { name: `${tag(clan)} ${clan.name}`, avatarUrl: clan.iconUrl }, bannerUrl: clan.bannerUrl };
}

function playerHeader(player: PlayerRef): ClanCardData["header"] {
  return { name: player.name, country: player.country, avatarUrl: player.cdnAvatarUrl ?? player.avatarUrl };
}

function teamClan(team: ClanWarTeamResponse): PublicClanResponse {
  return team.lead ?? team.sides[0].clan;
}

function warDeclared(war: ClanWarResponse, warId: string): ClanPost {
  const attacker = teamClan(war.attack);
  const defender = teamClan(war.defend);
  const accent = clanColor(attacker);
  return {
    card: {
      ...clanHeader(attacker),
      headerTitle: `Declared war on ${tag(defender)}`,
      accent,
      chips: [{ label: ARENA_LABEL[war.arena] ?? war.arena, color: accent }],
      icon: "target",
      kicker: RULESET_LABEL[war.ruleset] ?? war.ruleset,
      title: `${attacker.name} vs ${defender.name}`,
      description: war.declaredBy ? `Declared by ${war.declaredBy.name}` : undefined,
      value: { amount: war.attack.stake, unit: "STAKE" },
    },
    link: { label: "War", url: warUrl(warId) },
  };
}

function warEnded(war: ClanWarResponse, warId: string): ClanPost {
  const attacker = teamClan(war.attack);
  const defender = teamClan(war.defend);
  const atk = tag(attacker);
  const def = tag(defender);

  const [kicker, headerTitle, winner]: [string, string, ClanWarTeamResponse | null] = (() => {
    switch (war.outcome) {
      case "attacker_won":
        return ["Victory", `Defeated ${def}`, war.attack];
      case "defender_won":
        return ["Defended", `Held the line against ${atk}`, war.defend];
      case "drawn":
        return ["Draw", `Drew with ${def}`, null];
      case "retreated":
        return ["Retreat", `Retreated from ${def}`, null];
      case "forfeited":
        return ["Forfeit", `War with ${def} ended in a forfeit`, null];
      case "season_ended":
        return ["Season end", `War with ${def} called at season end`, null];
      default:
        return ["War over", `War with ${def} is over`, null];
    }
  })();

  const headerClan = winner ? teamClan(winner) : attacker;
  return {
    card: {
      ...clanHeader(headerClan),
      headerTitle,
      accent: winner ? clanColor(headerClan) : NEUTRAL,
      icon: winner ? "trophy" : "flag",
      kicker,
      title: `${attacker.name} vs ${defender.name}`,
      description: `${atk} ${whole(war.attack.stakeRemaining)} stake left · ${def} ${whole(war.defend.stakeRemaining)} stake left`,
      value: winner ? { amount: winner.stakeRemaining, unit: "STAKE LEFT" } : undefined,
    },
    link: { label: "War", url: warUrl(warId) },
  };
}

function warBreak(hit: ClanWarHitResponse, warId: string): ClanPost {
  const { attacker, victim, difficulty } = hit;
  return {
    card: {
      header: playerHeader(attacker),
      bannerUrl: attacker.clan?.bannerUrl,
      headerTitle: `Broke ${victim.name}'s guard`,
      accent: clanColor(attacker.clan),
      icon: "target",
      coverUrl: difficulty?.cdnCoverUrl ?? difficulty?.coverUrl,
      kicker: attacker.clan && victim.clan ? `${tag(attacker.clan)} vs ${tag(victim.clan)}` : "Guard break",
      title: difficulty?.songName ?? "Guard break",
      description: difficulty
        ? `${difficulty.songAuthor} - ${difficulty.mapAuthor} · ${formatDifficulty(difficulty.difficulty)}`
        : undefined,
      value: { amount: hit.standingMoved, unit: "STANDING" },
    },
    link: { label: "War", url: warUrl(warId) },
  };
}

function seasonClosed(closed: ClanSeasonClosedResponse): ClanPost {
  const [first, ...rest] = [...closed.top].sort((a, b) => a.rank - b.rank).slice(0, 3);
  const link = {
    label: "Season",
    url: `${WEBSITE_URL}/clans/seasons/${encodeURIComponent(closed.season.slug)}`,
  };
  if (!first) {
    return {
      card: {
        header: { name: closed.season.name },
        headerTitle: "Season is over",
        accent: GOLD,
        icon: "trophy",
        kicker: "Season over",
        title: closed.season.name,
        description: "No clans placed this season.",
      },
      link,
    };
  }
  return {
    card: {
      ...clanHeader(first.clan),
      headerTitle: `Won ${closed.season.name}`,
      accent: GOLD,
      icon: "trophy",
      kicker: "Season over",
      title: closed.season.name,
      description: rest.map((s) => `#${s.rank} ${tag(s.clan)} ${s.clan.name} - ${whole(s.standing)}`).join(" · ") || undefined,
      value: { amount: first.standing, unit: "STANDING" },
    },
    link,
  };
}

function pair(
  a: PublicClanResponse,
  b: PublicClanResponse,
  headerTitle: string,
  kicker: string,
  icon: ClanCardData["icon"],
  joiner: string
): ClanPost {
  return {
    card: {
      ...clanHeader(a),
      headerTitle,
      accent: clanColor(a),
      icon,
      kicker,
      title: `${a.name} ${joiner} ${b.name}`,
    },
    link: { label: "Clan", url: clanUrl(a) },
  };
}

export function buildClanPost(frame: ClanFeedFrame): ClanPost {
  switch (frame.type) {
    case "war_declared":
      return warDeclared(frame.data, frame.warId);
    case "war_ended":
      return warEnded(frame.data, frame.warId);
    case "war_break":
      return warBreak(frame.data, frame.warId);
    case "clan_founded": {
      const [clan] = frame.data;
      return {
        card: {
          ...clanHeader(clan),
          headerTitle: "A new clan rises",
          accent: clanColor(clan),
          icon: "flag",
          kicker: "New clan",
          title: clan.name,
        },
        link: { label: "Clan", url: clanUrl(clan) },
      };
    }
    case "alliance_formed": {
      const [a, b] = frame.data;
      return pair(a, b, `Allied with ${tag(b)}`, "Alliance", "sparkle", "&");
    }
    case "alliance_ended": {
      const [a, b] = frame.data;
      return pair(a, b, `Parted ways with ${tag(b)}`, "Alliance ended", "sparkle", "&");
    }
    case "rival_declared": {
      const [a, b] = frame.data;
      return pair(a, b, `Called out ${tag(b)} as a rival`, "Rivalry", "target", "vs");
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
    const { card, link } = buildClanPost(frame);

    try {
      const channel = await this.getChannel();
      if (!channel) {
        console.error("[ClanFeed] Could not resolve channel", config.clanFeed!.channelId);
        return;
      }

      const image = await renderClanCard(card);
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setLabel(link.label).setStyle(ButtonStyle.Link).setURL(link.url)
      );

      await channel.send({
        content: feedSearchLine([card.header.name], [card.headerTitle], [card.kicker, card.title]),
        allowedMentions: { parse: [] },
        files: [new AttachmentBuilder(image, { name: "clan-feed.png" })],
        components: [row],
      });
    } catch (err) {
      console.error("[ClanFeed] Failed to send:", err);
    }
  }
}
