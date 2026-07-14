import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "../client.js";
import { ApiError } from "../api/client.js";
import { getDiscordLink } from "../api/discord-links.js";
import { getUserLevel } from "../api/users.js";
import { errorEmbed, linkPromptEmbed } from "../utils/embeds.js";
import { syncLevelRoles } from "../utils/roles.js";
import { config } from "../config.js";

const update: Command = {
  data: new SlashCommandBuilder()
    .setName("update")
    .setDescription("Update your level roles based on your current AccSaber level"),

  async execute(interaction) {
    await interaction.deferReply();

    let link;
    try {
      link = await getDiscordLink(interaction.user.id);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        await interaction.editReply({
          embeds: [
            linkPromptEmbed(
              "You need to link your Discord account before your roles can be updated."
            ),
          ],
        });
        return;
      }
      throw err;
    }

    const levelData = await getUserLevel(link.userId);

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply({
        embeds: [errorEmbed("Error", "This command can only be used in a server.")],
      });
      return;
    }

    const member = await guild.members.fetch(interaction.user.id);

    if (config.roles.player && !member.roles.cache.has(config.roles.player)) {
      await member.roles.add(config.roles.player);
    }

    const result = await syncLevelRoles(member, levelData.level, config.roles);

    if (!result) {
      await interaction.editReply({
        embeds: [errorEmbed("Error", "Could not determine your level tier.")],
      });
      return;
    }

    const tierLabel = result.tier.name.charAt(0).toUpperCase() + result.tier.name.slice(1);
    const roleChanged = result.added || result.removed.length > 0;

    const embed = new EmbedBuilder()
      .setColor(result.tier.color)
      .addFields(
        { name: "Level", value: `\`${levelData.level}\``, inline: true },
        { name: "Tier", value: tierLabel, inline: true }
      );

    if (roleChanged) {
      embed
        .setTitle("Congratulations!")
        .setDescription(`${interaction.user} advanced to **${tierLabel}**!`);
    } else {
      embed
        .setTitle("Level Roles Updated")
        .setDescription("No role changes needed.");
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default update;
