import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from "discord.js";
import { getCategoryCodeById, getCategoryNameById } from "../api/categories.js";
import { getMapDifficultyComplexity, getMapLeaderboard, getUserScores } from "../api/scores.js";
import { getCategoryLeaderboardAt, getUserCategoryStatistics, getUserStatsDiff } from "../api/statistics.js";
import { getUserLevel } from "../api/users.js";
import { config } from "../config.js";
import type { ScoreResponse } from "../types/api.js";
import type { ScoreFeedConfig, TopRankCategoryConfig } from "../types/config.js";
import { CATEGORY_HEX } from "../utils/canvas-utils.js";
import { renderFeedCard, type FeedCardData } from "../utils/feed-card-renderer.js";
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
    if (score.rank === 0) return;

    const cards: FeedCardData[] = [];

    let milestoneFired = false;
    if (this.cfg.firstMilestone.enabled) {
      const result = await this.checkFirstMilestone(score).catch((err) => {
        console.error("[ScoreFeed] Trigger check failed:", err);
        return null;
      });
      if (result) {
        cards.push(result);
        milestoneFired = true;
      }
    }

    let allScoresFired = false;
    if (!milestoneFired && this.cfg.allScoresAbove.enabled) {
      const result = await this.checkAllScoresAbove(score).catch((err) => {
        console.error("[ScoreFeed] Trigger check failed:", err);
        return null;
      });
      if (result) {
        cards.push(result);
        allScoresFired = true;
      }
    }

    let rankOneFired = false;
    if (!milestoneFired && !allScoresFired && this.cfg.rankOne.enabled) {
      const result = await this.checkRankOne(score).catch((err) => {
        console.error("[ScoreFeed] Trigger check failed:", err);
        return null;
      });
      if (result) {
        cards.push(result);
        rankOneFired = true;
      }
    }

    const single: Promise<FeedCardData | null>[] = [];
    const multi: Promise<FeedCardData[]>[] = [];

    if (this.cfg.underdog.enabled) {
      single.push(this.checkUnderdog(score));
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
        cards.push(result.value);
      } else if (result.status === "rejected") {
        console.error("[ScoreFeed] Trigger check failed:", result.reason);
      }
    }
    let topRankFired = false;
    for (const result of multiResults) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        cards.push(...result.value);
        topRankFired = true;
      } else if (result.status === "rejected") {
        console.error("[ScoreFeed] Trigger check failed:", result.reason);
      }
    }

    if (!milestoneFired && !allScoresFired && !rankOneFired && !topRankFired && this.cfg.streak.enabled) {
      try {
        const streakResult = await this.checkStreak(score);
        if (streakResult) cards.push(streakResult);
      } catch (err) {
        console.error("[ScoreFeed] Trigger check failed:", err);
      }
    }

    if (cards.length === 0) return;

    const [levelResult, complexityResult] = await Promise.allSettled([
      getUserLevel(score.userId),
      getMapDifficultyComplexity(score.mapId, score.mapDifficultyId),
    ]);

    const level = levelResult.status === "fulfilled" ? levelResult.value.level : undefined;
    const complexity = complexityResult.status === "fulfilled" ? complexityResult.value : undefined;

    for (const card of cards) {
      card.level = level;
      card.complexity = complexity;
    }

    try {
      const channel = await this.getChannel();
      if (!channel) {
        console.error("[ScoreFeed] Could not resolve channel", this.cfg.channelId);
        return;
      }
      for (const card of cards) {
        const result = await renderFeedCard(card);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Profile")
            .setStyle(ButtonStyle.Link)
            .setURL(result.profileUrl),
          new ButtonBuilder()
            .setLabel("Map")
            .setStyle(ButtonStyle.Link)
            .setURL(result.mapUrl),
        );
        if (result.replayUrl) {
          row.addComponents(
            new ButtonBuilder()
              .setLabel("Replay")
              .setStyle(ButtonStyle.Link)
              .setURL(result.replayUrl),
          );
        }

        await channel.send({
          files: [new AttachmentBuilder(result.image, { name: "score-feed.png" })],
          components: [row],
        });
      }
    } catch (err) {
      console.error("[ScoreFeed] Failed to send:", err);
    }
  }

  private async checkFirstMilestone(
    score: ScoreResponse
  ): Promise<FeedCardData | null> {
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

    if (overallMatched) {
      const vars = {
        ...commonVars(score, category.name),
        threshold: overallMatched.ap,
        firstEverLabel: "EVER",
      };
      return {
        score,
        title: renderTemplate(overallMatched.messageTemplate, vars),
        accentColor: overallMatched.embedColor ?? firstMilestone.embedColor,
        categoryCode: category.code,
        categoryName: category.name,
        preamble: "They earned it with a score on:",
      };
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
    return {
      score,
      title: renderTemplate(catMatched.messageTemplate, vars),
      accentColor: catMatched.embedColor ?? firstMilestone.embedColor,
      categoryCode: category.code,
      categoryName: category.name,
      preamble: "They earned it with a score on:",
    };
  }

  private async checkAllScoresAbove(
    score: ScoreResponse
  ): Promise<FeedCardData | null> {
    const { allScoresAbove } = this.cfg;
    if (score.ap < allScoresAbove.apThreshold) return null;

    const category = await resolveCategory(score.categoryId);
    const vars = commonVars(score, category.name);

    return {
      score,
      title: renderTemplate(allScoresAbove.messageTemplate, vars),
      accentColor: allScoresAbove.embedColor,
      categoryCode: category.code,
      categoryName: category.name,
    };
  }

  private async checkUnderdog(
    score: ScoreResponse
  ): Promise<FeedCardData | null> {
    const { underdog } = this.cfg;
    if (score.rank > underdog.mapRankThreshold) return null;

    const category = await resolveCategory(score.categoryId);
    const stats = await getUserCategoryStatistics(score.userId, category.code);

    if (stats.ranking < underdog.minCategoryRank) return null;

    const vars = {
      ...commonVars(score, category.name),
      categoryRank: stats.ranking,
    };

    return {
      score,
      title: renderTemplate(underdog.messageTemplate, vars),
      accentColor: underdog.embedColor,
      categoryCode: category.code,
      categoryName: category.name,
      extraInfo: `Category rank: #${stats.ranking}`,
    };
  }

  private async checkRankOne(
    score: ScoreResponse
  ): Promise<FeedCardData | null> {
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
      extraInfo = `Sniped ${previous.userName} who had ${previous.ap.toFixed(2)} AP (${(previous.accuracy * 100).toFixed(2)}%)`;
    }

    return {
      score,
      title: renderTemplate(this.cfg.rankOne.messageTemplate, vars),
      accentColor: this.cfg.rankOne.embedColor,
      categoryCode: category.code,
      categoryName: category.name,
      extraInfo,
    };
  }

  private async checkTopRank(score: ScoreResponse): Promise<FeedCardData[]> {
    const { topRank } = this.cfg;
    const scoreCategory = await resolveCategory(score.categoryId);

    const categoriesToCheck = topRank.categories.filter(
      (c) => c.categoryCode === scoreCategory.code || c.categoryCode === "overall"
    );

    const results = await Promise.all(
      categoriesToCheck.map((cat) => this.checkTopRankForCategory(score, cat))
    );

    return results.filter((e): e is FeedCardData => e !== null);
  }

  private async checkTopRankForCategory(
    score: ScoreResponse,
    catConfig: TopRankCategoryConfig
  ): Promise<FeedCardData | null> {
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
    const accent = catConfig.embedColor ?? CATEGORY_HEX[catConfig.categoryCode] ?? CATEGORY_HEX.overall;
    const isDetail = currentRank <= topRank.detailThreshold;
    const showPassed = currentRank <= topRank.passedThreshold;

    let passedInfo = "";
    if (showPassed) {
      try {
        const passed = await getCategoryLeaderboardAt(stats.categoryId, currentRank + 1);
        if (passed && passed.userId !== score.userId) {
          passedInfo = ` - Passed ${passed.userName}`;
        }
      } catch { /* skip */ }
    }

    const subtitleVars = {
      categoryRank: currentRank,
      previousRank,
      categoryName: catName,
      passedInfo,
    };

    if (isDetail) {
      const key = `${score.userId}:${catConfig.categoryCode}:detail:${currentRank}`;
      if (this.topRankAnnounced.has(key)) return null;
      this.topRankAnnounced.add(key);

      const vars = {
        ...commonVars(score, catName),
        categoryRank: currentRank,
        previousRank,
        categoryName: catName,
      };

      return {
        score,
        title: renderTemplate(topRank.detailMessageTemplate, vars),
        accentColor: accent,
        categoryCode: catConfig.categoryCode,
        categoryName: catName,
        subtitle: renderTemplate(topRank.detailSubtitleTemplate, subtitleVars),
        preamble: "They earned it with a score on:",
      };
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

    return {
      score,
      title: renderTemplate(best.messageTemplate, vars),
      accentColor: accent,
      categoryCode: catConfig.categoryCode,
      categoryName: catName,
      subtitle: showPassed ? renderTemplate(topRank.thresholdSubtitleTemplate, subtitleVars) : undefined,
      preamble: "They earned it with a score on:",
    };
  }

  private async checkStreak(
    score: ScoreResponse
  ): Promise<FeedCardData | null> {
    const { streak } = this.cfg;

    const category = await resolveCategory(score.categoryId);

    const match = streak.categoryThresholds.find(
      (ct) => ct.categoryCode === category.code
    );
    if (!match) return null;
    if (score.streak115 < match.threshold) return null;

    const vars = commonVars(score, category.name);

    return {
      score,
      title: renderTemplate(streak.messageTemplate, vars),
      accentColor: streak.embedColor,
      categoryCode: category.code,
      categoryName: category.name,
    };
  }
}
