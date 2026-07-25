import { Events } from "discord.js";
import { getCategories } from "../api/categories.js";
import type { ArBot } from "../client.js";
import { config } from "../config.js";
import { CampaignFeed } from "../services/campaign-feed.js";
import { CampaignWebSocket } from "../services/campaign-ws.js";
import { CrateFeed } from "../services/crate-feed.js";
import { CrateWebSocket } from "../services/crate-ws.js";
import { MilestoneFeed } from "../services/milestone-feed.js";
import { MilestoneWebSocket } from "../services/milestone-ws.js";
import { MissionFeed } from "../services/mission-feed.js";
import { MissionWebSocket } from "../services/mission-ws.js";
import { ScoreFeed } from "../services/score-feed.js";
import { ScoreWebSocket } from "../services/score-ws.js";
import { scheduleSupporterReconciliation } from "../services/supporter-reconcile.js";
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

    if (config.supporters?.enabled) {
      scheduleSupporterReconciliation(client);
    }

    if (config.milestoneFeed?.enabled) {
      const feed = new MilestoneFeed(client);
      const ws = new MilestoneWebSocket();
      ws.onMilestone((payload) => {
        feed.handlePayload(payload).catch((err) => {
          console.error("[MilestoneFeed] Error handling payload:", err);
        });
      });
      ws.connect();
      client.milestoneWs = ws;
      console.log("[MilestoneFeed] Milestone feed started");
    }

    if (config.missionFeed?.enabled) {
      const feed = new MissionFeed(client);
      const ws = new MissionWebSocket();
      ws.onMission((payload) => {
        feed.handlePayload(payload).catch((err) => {
          console.error("[MissionFeed] Error handling payload:", err);
        });
      });
      ws.connect();
      client.missionWs = ws;
      console.log("[MissionFeed] Mission feed started");
    }

    if (config.crateFeed?.enabled) {
      const feed = new CrateFeed(client);
      const ws = new CrateWebSocket();
      ws.onCrateOpened((frame) => {
        feed.handleFrame(frame).catch((err) => {
          console.error("[CrateFeed] Error handling frame:", err);
        });
      });
      ws.connect();
      client.crateWs = ws;
      console.log("[CrateFeed] Crate feed started");
    }

    if (config.campaignFeed?.enabled) {
      const feed = new CampaignFeed(client);
      const ws = new CampaignWebSocket();
      ws.onCampaignProgress((frame) => {
        feed.handleFrame(frame).catch((err) => {
          console.error("[CampaignFeed] Error handling frame:", err);
        });
      });
      ws.connect();
      client.campaignWs = ws;
      console.log("[CampaignFeed] Campaign feed started");
    }
  },
};
