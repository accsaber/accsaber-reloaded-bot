import { Events } from "discord.js";
import { getCategories } from "../api/categories.js";
import type { ArBot } from "../client.js";
import { config } from "../config.js";
import { ScoreFeed } from "../services/score-feed.js";
import { ScoreWebSocket } from "../services/score-ws.js";
import { publishRoleMessage } from "./reaction-roles.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: ArBot) {
    console.log(`Ready as ${client.user?.tag}`);
    try {
      await publishRoleMessage(client);
    } catch (err) {
      console.error("[ReactionRoles] Failed to publish role message:", err);
    }

    if (config.scoreFeed) {
      try {
        await getCategories();
        console.log("[ScoreFeed] Categories cached");
      } catch (err) {
        console.error("[ScoreFeed] Failed to pre-warm categories:", err);
      }

      const feed = new ScoreFeed(client);
      const ws = new ScoreWebSocket();
      ws.onScore((score) => {
        feed.handleScore(score).catch((err) => {
          console.error("[ScoreFeed] Error handling score:", err);
        });
      });
      ws.connect();
      client.scoreWs = ws;
      console.log("[ScoreFeed] Score feed started");
    }
  },
};
