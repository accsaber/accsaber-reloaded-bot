import { type Client, type TextChannel } from "discord.js";
import { getCategoryCodeById, getCategoryNameById } from "../api/categories.js";
import { getMapLeaderboard, getUserScores } from "../api/scores.js";
import { getUserCategoryStatistics, getUserStatsDiff } from "../api/statistics.js";
import { config } from "../config.js";
import type { ScoreResponse } from "../types/api.js";
import type { ScoreFeedConfig, TopRankCategoryConfig } from "../types/config.js";
import {
  buildFeedEmbed,
  parseHexColor,
  type FeedEmbedResult,
} from "../utils/score-feed-embeds.js";
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
  private readonly topRankAnnounced = new Set<string>();

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
    const messages: FeedEmbedResult[] = [];

    let rankOneFired = false;
    if (this.cfg.rankOne.enabled) {
      const result = await this.checkRankOne(score).catch((err) => {
        console.error("[ScoreFeed] Trigger check failed:", err);
        return null;
      });
      if (result) {
        messages.push(result);
        rankOneFired = true;
      }
    }

    let allScoresFired = false;
    if (this.cfg.allScoresAbove.enabled) {
      const result = await this.checkAllScoresAbove(score).catch((err) => {
        console.error("[ScoreFeed] Trigger check failed:", err);
        return null;
      });
      if (result) {
        messages.push(result);
        allScoresFired = true;
      }
    }

    const single: Promise<FeedEmbedResult | null>[] = [];
    const multi: Promise<FeedEmbedResult[]>[] = [];

    if (!allScoresFired && this.cfg.firstMilestone.enabled) {
      single.push(this.checkFirstMilestone(score));
    }
    if (this.cfg.underdog.enabled) {
      single.push(this.checkUnderdog(score));
    }
    if (!rankOneFired && this.cfg.streak.enabled) {
      single.push(this.checkStreak(score));
    }
    if (this.cfg.topRank.enabled) {
      multi.push(this.checkTopRank(score));
    }

    const [singleResults, multiResults] = await Promise.all([
      Promise.allSettled(single),
      Promise.allSettled(multi),
    ]);

    for (const result of singleResults) {
      if (result.status === "fulfilled" && result.value) {
        messages.push(result.value);
      } else if (result.status === "rejected") {
        console.error("[ScoreFeed] Trigger check failed:", result.reason);
      }
    }
    for (const result of multiResults) {
      if (result.status === "fulfilled") {
        messages.push(...result.value);
      } else {
        console.error("[ScoreFeed] Trigger check failed:", result.reason);
      }
    }

    if (messages.length === 0) return;

    try {
      const channel = await this.getChannel();
      if (!channel) {
        console.error("[ScoreFeed] Could not resolve channel", this.cfg.channelId);
        return;
      }
      for (const msg of messages) {
        await channel.send({ embeds: [msg.embed], components: [msg.row] });
      }
    } catch (err) {
      console.error("[ScoreFeed] Failed to send embed:", err);
    }
  }

  private async checkFirstMilestone(
    score: ScoreResponse
  ): Promise<FeedEmbedResult | null> {
    const { firstMilestone } = this.cfg;
    const enabledThresholds = firstMilestone.thresholds
      .filter((t) => t.enabled && score.ap >= t.ap)
      .sort((a, b) => b.ap - a.ap);

    if (enabledThresholds.length === 0) return null;

    const [overallPage, categoryPage] = await Promise.all([
      getUserScores(score.userId, { size: 2, sort: "ap,desc" }),
      getUserScores(score.userId, { categoryId: score.categoryId, size: 2, sort: "ap,desc" }),
    ]);

    const category = await resolveCategory(score.categoryId);

    const overallTop = overallPage.content[0];
    const prevOverallAp = overallPage.content.length > 1 ? overallPage.content[1].ap : 0;
    const isNewOverallTop = overallTop?.id === score.id;
    const overallMatched = isNewOverallTop
      ? enabledThresholds.find((t) => prevOverallAp < t.ap)
      : undefined;

    const preamble = "They earned it with a score on:";

    if (overallMatched) {
      const vars = {
        ...commonVars(score, category.name),
        threshold: overallMatched.ap,
        firstEverLabel: "EVER",
      };
      return buildFeedEmbed({
        score,
        color: parseHexColor(overallMatched.embedColor ?? firstMilestone.embedColor),
        title: renderTemplate(overallMatched.messageTemplate, vars),
        categoryName: category.name,
        linkTarget: "map",
        preamble,
      });
    }

    const categoryTop = categoryPage.content[0];
    if (!categoryTop || categoryTop.id !== score.id) return null;

    const prevCatAp = categoryPage.content.length > 1 ? categoryPage.content[1].ap : 0;
    const catMatched = enabledThresholds.find((t) => prevCatAp < t.ap);
    if (!catMatched) return null;

    const vars = {
      ...commonVars(score, category.name),
      threshold: catMatched.ap,
      firstEverLabel: `in ${category.name}`,
    };
    return buildFeedEmbed({
      score,
      color: parseHexColor(catMatched.embedColor ?? firstMilestone.embedColor),
      title: renderTemplate(catMatched.messageTemplate, vars),
      categoryName: category.name,
      linkTarget: "map",
      preamble,
    });
  }

  private async checkAllScoresAbove(
    score: ScoreResponse
  ): Promise<FeedEmbedResult | null> {
    const { allScoresAbove } = this.cfg;
    if (score.ap < allScoresAbove.apThreshold) return null;

    const category = await resolveCategory(score.categoryId);
    const vars = commonVars(score, category.name);

    return buildFeedEmbed({
      score,
      color: parseHexColor(allScoresAbove.embedColor),
      title: renderTemplate(allScoresAbove.messageTemplate, vars),
      categoryName: category.name,
      linkTarget: "map",
    });
  }

  private async checkUnderdog(
    score: ScoreResponse
  ): Promise<FeedEmbedResult | null> {
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
      categoryName: category.name,
      linkTarget: "map",
      extraInfo: `Category rank: \`#${stats.ranking}\``,
    });
  }

  private async checkRankOne(
    score: ScoreResponse
  ): Promise<FeedEmbedResult | null> {
    if (score.rank !== 1) return null;

    const category = await resolveCategory(score.categoryId);
    const vars = commonVars(score, category.name);

    let extraInfo: string | undefined;
    const leaderboard = await getMapLeaderboard(score.mapDifficultyId, {
      page: 0,
      size: 2,
      sort: "score,desc",
    });
    const previous = leaderboard.content.find(
      (s) => s.rank === 2 && s.userId !== score.userId
    );
    if (previous) {
      extraInfo = `Sniped **${previous.userName}** who had \`${previous.ap.toFixed(2)} AP\` (\`${(previous.accuracy * 100).toFixed(2)}%\`)`;
    }

    return buildFeedEmbed({
      score,
      color: parseHexColor(this.cfg.rankOne.embedColor),
      title: renderTemplate(this.cfg.rankOne.messageTemplate, vars),
      categoryName: category.name,
      linkTarget: "profile",
      extraInfo,
    });
  }

  private async checkTopRank(score: ScoreResponse): Promise<FeedEmbedResult[]> {
    const { topRank } = this.cfg;
    const scoreCategory = await resolveCategory(score.categoryId);

    const categoriesToCheck = topRank.categories.filter(
      (c) => c.categoryCode === scoreCategory.code || c.categoryCode === "overall"
    );

    const results = await Promise.all(
      categoriesToCheck.map((cat) => this.checkTopRankForCategory(score, cat))
    );

    return results.filter((e): e is FeedEmbedResult => e !== null);
  }

  private async checkTopRankForCategory(
    score: ScoreResponse,
    catConfig: TopRankCategoryConfig
  ): Promise<FeedEmbedResult | null> {
    const { topRank } = this.cfg;

    const [stats, diff] = await Promise.all([
      getUserCategoryStatistics(score.userId, catConfig.categoryCode),
      getUserStatsDiff(score.userId, catConfig.categoryCode),
    ]);

    const currentRank = stats.ranking;
    const previousRank = diff ? currentRank - diff.rankingDiff : currentRank;
    if (currentRank === previousRank) return null;

    const catName = catConfig.categoryCode === "overall"
      ? "Overall"
      : (await getCategoryNameById(stats.categoryId)) ?? catConfig.categoryCode;
    const color = parseHexColor(catConfig.embedColor);
    const preamble = "They earned it with a score on:";

    if (currentRank <= topRank.detailThreshold) {
      const key = `${score.userId}:${catConfig.categoryCode}:detail:${currentRank}`;
      if (this.topRankAnnounced.has(key)) return null;
      this.topRankAnnounced.add(key);

      const vars = {
        ...commonVars(score, catName),
        categoryRank: currentRank,
        previousRank,
        categoryName: catName,
      };

      return buildFeedEmbed({
        score,
        color,
        title: renderTemplate(topRank.detailMessageTemplate, vars),
        categoryName: catName,
        linkTarget: "profile",
        preamble,
        extraInfo: `Moved from \`#${previousRank}\` to \`#${currentRank}\` in **${catName}**`,
      });
    }

    const crossed = topRank.thresholds
      .filter((t) => t.enabled && currentRank <= t.rank && previousRank > t.rank)
      .sort((a, b) => a.rank - b.rank);

    if (crossed.length === 0) return null;

    const best = crossed[0];
    const key = `${score.userId}:${catConfig.categoryCode}:${best.rank}`;
    if (this.topRankAnnounced.has(key)) return null;
    this.topRankAnnounced.add(key);

    const vars = {
      ...commonVars(score, catName),
      topRank: best.rank,
      categoryRank: currentRank,
      categoryName: catName,
    };

    return buildFeedEmbed({
      score,
      color,
      title: renderTemplate(best.messageTemplate, vars),
      categoryName: catName,
      linkTarget: "profile",
      preamble,
    });
  }

  private async checkStreak(
    score: ScoreResponse
  ): Promise<FeedEmbedResult | null> {
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
      categoryName: category.name,
      linkTarget: "map",
    });
  }
}
