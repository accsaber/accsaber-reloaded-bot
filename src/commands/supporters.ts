import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { ArBot } from "../client.js";
import type { Command } from "../client.js";
import { config } from "../config.js";
import {
  formatReconcileSummary,
  reconcileSupporterRoles,
} from "../services/supporter-reconcile.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";

const supporters: Command = {
  data: new SlashCommandBuilder()
    .setName("supporters")
    .setDescription("Supporter management commands.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("reconcile")
        .setDescription(
          "Walk supporter role holders and revoke stale roles (admin only)."
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const adminRoleIds = config.supporters?.adminRoleIds ?? [];
    if (adminRoleIds.length > 0) {
      const member = interaction.member;
      const memberRoles =
        member && "roles" in member
          ? typeof member.roles === "object" && "cache" in member.roles
            ? Array.from(member.roles.cache.keys())
            : Array.isArray(member.roles)
              ? member.roles
              : []
          : [];
      const hasRole = adminRoleIds.some((r) => memberRoles.includes(r));
      if (!hasRole) {
        await interaction.editReply({
          embeds: [
            errorEmbed(
              "Not Allowed",
              "You do not have permission to use this command."
            ),
          ],
        });
        return;
      }
    }

    const sub = interaction.options.getSubcommand(true);
    if (sub !== "reconcile") {
      await interaction.editReply({
        embeds: [errorEmbed("Unknown Subcommand", `Unknown subcommand: ${sub}`)],
      });
      return;
    }

    const summary = await reconcileSupporterRoles(
      interaction.client as ArBot,
      { dmOnRevoke: true }
    );
    await interaction.editReply({
      embeds: [
        successEmbed("Reconciliation Complete", formatReconcileSummary(summary)),
      ],
    });
  },
};

export default supporters;
