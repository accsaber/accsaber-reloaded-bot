import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { getCategories } from "../api/categories.js";
import { ApiError } from "../api/client.js";
import { getDiscordLink } from "../api/discord-links.js";
import { getUserScores } from "../api/scores.js";
import { getUserStatsDiff } from "../api/statistics.js";
import { getUser, getUserAllStatistics, getUserLevel } from "../api/users.js";
import type { Command } from "../client.js";
import { renderProfileCard } from "../utils/card-renderer.js";
import { errorEmbed, linkPromptEmbed } from "../utils/embeds.js";

const get: Command = {
  data: new SlashCommandBuilder()
    .setName("get")
    .setDescription("Show a player's AccSaber profile card")
    .addStringOption((option) =>
      option
        .setName("user-id")
        .setDescription("Player's user ID (defaults to your linked account)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Stats category to display (default: Overall)")
        .setRequired(false)
        .addChoices(
          { name: "Overall", value: "overall" },
          { name: "True Acc", value: "true_acc" },
          { name: "Standard Acc", value: "standard_acc" },
          { name: "Tech Acc", value: "tech_acc" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Score display mode (default: Top)")
        .setRequired(false)
        .addChoices(
          { name: "Top", value: "top" },
          { name: "Recent", value: "recent" }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    let userId = interaction.options.getString("user-id");
    const categoryCode =
      interaction.options.getString("category") ?? "overall";
    const mode = interaction.options.getString("mode") ?? "top";

    if (!userId) {
      try {
        const link = await getDiscordLink(interaction.user.id);
        userId = link.userId;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          await interaction.editReply({
            embeds: [
              linkPromptEmbed(
                "You haven't linked your Discord account yet. You can also pass a `user-id` to look up any player."
              ),
            ],
          });
          return;
        }
        throw err;
      }
    }

    const categories = await getCategories();
    const categoryIdToCode: Record<string, string> = {};
    for (const cat of categories) {
      categoryIdToCode[cat.id] = cat.code;
    }
    const targetCat = categories.find((c) => c.code === categoryCode);

    const scoresParams: { size: number; sort: string; categoryId?: string } = {
      size: 5,
      sort: mode === "recent" ? "timeSet,desc" : "weightedAp,desc",
    };
    if (targetCat && categoryCode !== "overall") {
      scoresParams.categoryId = targetCat.id;
    }

    const [userResult, levelResult, allStatsResult, diffResult, scoresResult] =
      await Promise.allSettled([
        getUser(userId),
        getUserLevel(userId),
        getUserAllStatistics(userId),
        getUserStatsDiff(userId, categoryCode),
        getUserScores(userId, scoresParams),
      ]);

    if (userResult.status === "rejected") {
      if (
        userResult.reason instanceof ApiError &&
        userResult.reason.status === 404
      ) {
        await interaction.editReply({
          embeds: [
            errorEmbed(
              "Player Not Found",
              `No AccSaber profile found for \`${userId}\`.`
            ),
          ],
        });
        return;
      }
      throw userResult.reason;
    }

    const user = userResult.value;

    if (user.banned) {
      await interaction.editReply({
        embeds: [errorEmbed("Player Banned", `**${user.name}** is banned.`)],
      });
      return;
    }

    const level =
      levelResult.status === "fulfilled" ? levelResult.value : undefined;
    const allStats =
      allStatsResult.status === "fulfilled" ? allStatsResult.value : undefined;
    const diff =
      diffResult.status === "fulfilled" ? diffResult.value : undefined;
    const scores =
      scoresResult.status === "fulfilled" ? scoresResult.value : undefined;

    const categoryStats = allStats?.categories.find(
      (s) => s.categoryId === targetCat?.id
    );

    const imageBuffer = await renderProfileCard({
      name: user.name,
      avatarUrl: user.avatarUrl,
      country: user.country,
      categoryCode,
      level,
      stats: categoryStats,
      diff,
      topScores: scores?.content ?? [],
      scoresLabel: mode === "recent" ? "RECENT SCORES" : "TOP SCORES",
      categoryIdToCode,
    });

    await interaction.editReply({
      files: [new AttachmentBuilder(imageBuffer, { name: "profile-card.png" })],
    });
  },
};

export default get;
