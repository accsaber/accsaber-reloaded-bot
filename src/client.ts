import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { FeedWebSocket } from "./services/feed.js";
import type {
  CampaignFeedFrame,
  ClanFeedFrame,
  CrateFeedFrame,
  MilestoneCompletedPayload,
  MissionCompletedPayload,
  ScoreResponse,
} from "./types/api.js";

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export class ArBot extends Client {
  commands = new Collection<string, Command>();
  scoreWs?: FeedWebSocket<ScoreResponse>;
  milestoneWs?: FeedWebSocket<MilestoneCompletedPayload>;
  missionWs?: FeedWebSocket<MissionCompletedPayload>;
  crateWs?: FeedWebSocket<CrateFeedFrame>;
  campaignWs?: FeedWebSocket<CampaignFeedFrame>;
  clanWs?: FeedWebSocket<ClanFeedFrame>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [
        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.User,
      ],
    });
  }
}
