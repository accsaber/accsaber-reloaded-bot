import { Events } from "discord.js";
import { getCategories } from "../api/categories.js";
import type { ArBot } from "../client.js";
import { config } from "../config.js";
import { CampaignFeed } from "../services/campaign-feed.js";
import { parseCampaignFrame } from "../services/campaign-rules.js";
import { ClanFeed, parseClanFrame } from "../services/clan-feed.js";
import { CrateFeed } from "../services/crate-feed.js";
import { parseCrateFrame } from "../services/crate-rules.js";
import { FeedWebSocket } from "../services/feed.js";
import { MilestoneFeed } from "../services/milestone-feed.js";
import { MissionFeed } from "../services/mission-feed.js";
import { ScoreFeed } from "../services/score-feed.js";
import type {
  MilestoneCompletedPayload,
  MissionCompletedPayload,
  ScoreResponse,
} from "../types/api.js";
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
      const ws = new FeedWebSocket<ScoreResponse>("ScoreFeed", "/ws/scores", config.scoreFeed.wsUrl);
      ws.onMessage((score) => {
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
      const ws = new FeedWebSocket<MilestoneCompletedPayload>(
        "MilestoneFeed",
        "/ws/milestones",
        config.milestoneFeed.wsUrl
      );
      ws.onMessage((payload) => {
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
      const ws = new FeedWebSocket<MissionCompletedPayload>(
        "MissionFeed",
        "/ws/missions",
        config.missionFeed.wsUrl
      );
      ws.onMessage((payload) => {
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
      const ws = new FeedWebSocket("CrateFeed", "/ws/crates", config.crateFeed.wsUrl, parseCrateFrame);
      ws.onMessage((frame) => {
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
      const ws = new FeedWebSocket(
        "CampaignFeed",
        "/ws/campaigns/progress",
        config.campaignFeed.wsUrl,
        parseCampaignFrame
      );
      ws.onMessage((frame) => {
        feed.handleFrame(frame).catch((err) => {
          console.error("[CampaignFeed] Error handling frame:", err);
        });
      });
      ws.connect();
      client.campaignWs = ws;
      console.log("[CampaignFeed] Campaign feed started");
    }

    if (config.clanFeed?.enabled) {
      const feed = new ClanFeed(client);
      const ws = new FeedWebSocket("ClanFeed", "/ws/clans", config.clanFeed.wsUrl, parseClanFrame);
      ws.onMessage((frame) => {
        feed.handleFrame(frame).catch((err) => {
          console.error("[ClanFeed] Error handling frame:", err);
        });
      });
      ws.connect();
      client.clanWs = ws;
      console.log("[ClanFeed] Clan feed started");
    }
  },
};
