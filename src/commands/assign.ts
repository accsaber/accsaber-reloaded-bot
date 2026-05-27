import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../client.js";
import { ApiError } from "../api/client.js";
import { assignSupporter } from "../api/supporters.js";
import { config } from "../config.js";
import { errorEmbed, successEmbed, warningEmbed } from "../utils/embeds.js";

const assign: Command = {
  data: new SlashCommandBuilder()
    .setName("assign")
    .setDescription("Manually link a Ko-fi tip/transaction to an AccSaber player.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("kofi_transaction_id")
        .setDescription("Ko-fi transaction ID (from Ko-fi dashboard or webhook log)")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The supporter to grant the tier to")
        .setRequired(true)
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

    const txnId = interaction.options.getString("kofi_transaction_id", true);
    const user = interaction.options.getUser("user", true);

    try {
      await assignSupporter({ kofiTransactionId: txnId, discordId: user.id });
      await interaction.editReply({
        embeds: [
          successEmbed(
            "Supporter Assigned",
            `Assigned Ko-fi transaction \`${txnId}\` to <@${user.id}>. Their supporter tier has been activated.`
          ),
        ],
      });
      return;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          const msg = err.message?.toLowerCase() ?? "";
          const isLinkIssue = msg.includes("link") || msg.includes("discord") || msg.includes("user");
          if (isLinkIssue) {
            await interaction.editReply({
              embeds: [
                errorEmbed(
                  "Not Linked",
                  `<@${user.id}> hasn't linked their Discord to AccSaber. Ask them to run \`/register\` first.`
                ),
              ],
            });
          } else {
            await interaction.editReply({
              embeds: [
                errorEmbed(
                  "Transaction Not Found",
                  `No Ko-fi transaction with ID \`${txnId}\` found. Double-check the ID from the Ko-fi dashboard.`
                ),
              ],
            });
          }
          return;
        }
        if (err.status === 409) {
          await interaction.editReply({
            embeds: [
              warningEmbed(
                "Already Claimed",
                `That Ko-fi transaction has already been claimed. Investigate before reassigning.\n\n${err.message}`
              ),
            ],
          });
          return;
        }
        await interaction.editReply({
          embeds: [errorEmbed("Assignment Failed", err.message)],
        });
        return;
      }
      throw err;
    }
  },
};

export default assign;
