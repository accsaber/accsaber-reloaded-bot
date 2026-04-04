import { type Client, type EmbedBuilder, type TextChannel } from "discord.js";
import { getCategoryCodeById, getCategoryNameById } from "../api/categories.js";
import { getUserScores } from "../api/scores.js";
import { getUserCategoryStatistics } from "../api/statistics.js";
import { config } from "../config.js";
import type { ScoreResponse } from "../types/api.js";
import type { ScoreFeedConfig } from "../types/config.js";
import { buildFeedEmbed, parseHexColor } from "../utils/score-feed-embeds.js";
import { renderTemplate } from "../utils/templates.js";

function commonVars(
  score: ScoreResponse,
  categoryName: string
): Record<string, string | number> {
  return {
    playerName: score.userName,
    ap: score.ap.toFixed(2),
    accuracy: (score.accuracy * 100).toFixed(2),
    songName: score.songName,
    songAuthor: score.songAuthor,
    mapAuthor: score.mapAuthor,
    difficulty: score.difficulty,
    rank: score.rank,
    categoryName,
    streak115: score.streak115,
    score: score.score,
  };
}

async function resolveCategory(categoryId: string) {
  const code = (await getCategoryCodeById(categoryId)) ?? "overall";
  const name = (await getCategoryNameById(categoryId)) ?? "Overall";
  return { code, name };
}

export class ScoreFeed {
  private readonly client: Client;
  private readonly cfg: ScoreFeedConfig;
  private channel: TextChannel | null = null;

  constructor(client: Client) {
    this.client = client;
    this.cfg = config.scoreFeed!;
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

  async handleScore(score: ScoreResponse): Promise<void> {
    const checks: Promise<EmbedBuilder | null>[] = [];

    if (this.cfg.firstMilestone.enabled) {
      checks.push(this.checkFirstMilestone(score));
    }
    if (this.cfg.allScoresAbove.enabled) {
      checks.push(this.checkAllScoresAbove(score));
    }
    if (this.cfg.underdog.enabled) {
      checks.push(this.checkUnderdog(score));
    }
    if (this.cfg.rankOne.enabled) {
      checks.push(this.checkRankOne(score));
    }
    if (this.cfg.topRank.enabled) {
      checks.push(this.checkTopRank(score));
    }
    if (this.cfg.streak.enabled) {
      checks.push(this.checkStreak(score));
    }

    const results = await Promise.allSettled(checks);
    const embeds: EmbedBuilder[] = [];

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        embeds.push(result.value);
      } else if (result.status === "rejected") {
        console.error("[ScoreFeed] Trigger check failed:", result.reason);
      }
    }

    if (embeds.length === 0) return;

    try {
      const channel = await this.getChannel();
      if (!channel) {
        console.error("[ScoreFeed] Could not resolve channel", this.cfg.channelId);
        return;
      }
      for (const embed of embeds) {
        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error("[ScoreFeed] Failed to send embed:", err);
    }
  }

  private async checkFirstMilestone(
    score: ScoreResponse
  ): Promise<EmbedBuilder | null> {
    const { firstMilestone } = this.cfg;
    const enabledThresholds = firstMilestone.thresholds
      .filter((t) => t.enabled && score.ap >= t.ap)
      .sort((a, b) => b.ap - a.ap);

    if (enabledThresholds.length === 0) return null;

    const page = await getUserScores(score.userId, {
      size: 2,
      sort: "ap,desc",
    });

    if (page.content.length === 0) return null;

    const topScore = page.content[0];
    if (topScore.id !== score.id) return null;

    const previousBestAp = page.content.length > 1 ? page.content[1].ap : 0;

    const matchedThreshold = enabledThresholds.find(
      (t) => previousBestAp < t.ap
    );
    if (!matchedThreshold) return null;

    const category = await resolveCategory(score.categoryId);
    const vars = {
      ...commonVars(score, category.name),
      threshold: matchedThreshold.ap,
    };
    const color = parseHexColor(
      matchedThreshold.embedColor ?? firstMilestone.embedColor
    );

    return buildFeedEmbed({
      score,
      color,
      title: renderTemplate(matchedThreshold.messageTemplate, vars),
      linkTarget: "map",
    });
  }

  private async checkAllScoresAbove(
    score: ScoreResponse
  ): Promise<EmbedBuilder | null> {
    const { allScoresAbove } = this.cfg;
    if (score.ap < allScoresAbove.apThreshold) return null;

    const category = await resolveCategory(score.categoryId);
    const vars = commonVars(score, category.name);

    return buildFeedEmbed({
      score,
      color: parseHexColor(allScoresAbove.embedColor),
      title: renderTemplate(allScoresAbove.messageTemplate, vars),
      linkTarget: "map",
    });
  }

  private async checkUnderdog(
    score: ScoreResponse
  ): Promise<EmbedBuilder | null> {
    const { underdog } = this.cfg;
    if (score.rank > underdog.mapRankThreshold) return null;

    const category = await resolveCategory(score.categoryId);
    const stats = await getUserCategoryStatistics(
      score.userId,
      category.code
    );

    if (stats.ranking < underdog.minCategoryRank) return null;

    const vars = {
      ...commonVars(score, category.name),
      categoryRank: stats.ranking,
    };

    return buildFeedEmbed({
      score,
      color: parseHexColor(underdog.embedColor),
      title: renderTemplate(underdog.messageTemplate, vars),
      linkTarget: "map",
      extraInfo: `Category rank: \`#${stats.ranking}\``,
    });
  }

  private async checkRankOne(
    score: ScoreResponse
  ): Promise<EmbedBuilder | null> {
    if (score.rank !== 1) return null;

    const category = await resolveCategory(score.categoryId);
    const vars = commonVars(score, category.name);

    return buildFeedEmbed({
      score,
      color: parseHexColor(this.cfg.rankOne.embedColor),
      title: renderTemplate(this.cfg.rankOne.messageTemplate, vars),
      linkTarget: "profile",
    });
  }

  private async checkTopRank(
    score: ScoreResponse
  ): Promise<EmbedBuilder | null> {
    const { topRank } = this.cfg;

    const sorted = topRank.thresholds
      .filter((t) => t.enabled && score.rank <= t.rank)
      .sort((a, b) => a.rank - b.rank);

    if (sorted.length === 0) return null;

    const best = sorted[0];

    const category = await resolveCategory(score.categoryId);
    const vars = {
      ...commonVars(score, category.name),
      topRank: best.rank,
    };
    const color = parseHexColor(best.embedColor ?? topRank.embedColor);

    return buildFeedEmbed({
      score,
      color,
      title: renderTemplate(best.messageTemplate, vars),
      linkTarget: "profile",
    });
  }

  private async checkStreak(
    score: ScoreResponse
  ): Promise<EmbedBuilder | null> {
    const { streak } = this.cfg;

    const category = await resolveCategory(score.categoryId);

    const match = streak.categoryThresholds.find(
      (ct) => ct.categoryCode === category.code
    );
    if (!match) return null;
    if (score.streak115 < match.threshold) return null;

    const vars = commonVars(score, category.name);

    return buildFeedEmbed({
      score,
      color: parseHexColor(streak.embedColor),
      title: renderTemplate(streak.messageTemplate, vars),
      linkTarget: "map",
      extraInfo: `115 streak: \`${score.streak115}\``,
    });
  }
}
