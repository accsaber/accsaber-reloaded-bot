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
import type { MilestoneWebSocket } from "./services/milestone-ws.js";
import type { MissionWebSocket } from "./services/mission-ws.js";
import type { ScoreWebSocket } from "./services/score-ws.js";

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export class ArBot extends Client {
  commands = new Collection<string, Command>();
  scoreWs?: ScoreWebSocket;
  milestoneWs?: MilestoneWebSocket;
  missionWs?: MissionWebSocket;

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
