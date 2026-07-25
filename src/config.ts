import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Config } from "./types/config.js";

const configPath = resolve(process.cwd(), "config.json");

function loadConfig(): Config {
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as Config;

  const required: string[] = [];
  if (!parsed.clientId) required.push("clientId");
  if (!parsed.guildId) required.push("guildId");
  if (!parsed.api?.baseUrl) required.push("api.baseUrl");
  if (!parsed.roles?.levelTiers) required.push("roles.levelTiers");

  if (parsed.milestoneFeed) {
    const mf = parsed.milestoneFeed;
    if (!mf.channelId) required.push("milestoneFeed.channelId");
    if (!mf.rules) required.push("milestoneFeed.rules");
    if (!mf.rules?.firstCompletion) required.push("milestoneFeed.rules.firstCompletion");
    if (!mf.rules?.rare) required.push("milestoneFeed.rules.rare");
    if (!mf.rules?.diamondPlus) required.push("milestoneFeed.rules.diamondPlus");
    if (mf.completionStatsTtlSeconds === undefined) {
      required.push("milestoneFeed.completionStatsTtlSeconds");
    }
  }

  if (parsed.missionFeed) {
    const mf = parsed.missionFeed;
    if (!mf.channelId) required.push("missionFeed.channelId");
    if (!mf.bands || mf.bands.length === 0) required.push("missionFeed.bands");
    if (!mf.messageTemplate) required.push("missionFeed.messageTemplate");
  }

  if (parsed.crateFeed?.enabled) {
    const cf = parsed.crateFeed;
    if (!cf.channelId) required.push("crateFeed.channelId");
    if (!cf.rarities || cf.rarities.length === 0) required.push("crateFeed.rarities");
    if (!cf.messageTemplate) required.push("crateFeed.messageTemplate");
  }

  if (required.length > 0) {
    throw new Error(`Missing required config fields: ${required.join(", ")}`);
  }

  return parsed;
}

export const config = loadConfig();
