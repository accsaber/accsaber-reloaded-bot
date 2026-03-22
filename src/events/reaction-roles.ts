import { EmbedBuilder, Events, type MessageReaction, type PartialMessageReaction, type PartialUser, type User } from "discord.js";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ArBot } from "../client.js";
import { config } from "../config.js";
import { Colors } from "../utils/embeds.js";

function getEntryByEmoji(emoji: string) {
  if (!config.reactionRoles) return undefined;
  return Object.values(config.reactionRoles.roles).find((r) => r.emoji === emoji);
}

async function resolveReaction(reaction: MessageReaction | PartialMessageReaction) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return null;
    }
  }
  return reaction;
}

export async function publishRoleMessage(client: ArBot): Promise<void> {
  const rc = config.reactionRoles;
  if (!rc || !rc.channelId) return;

  const channel = await client.channels.fetch(rc.channelId);
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

  const lines = Object.values(rc.roles).map(
    (r) => `${r.emoji}  —  **${r.label}**`
  );

  const embed = new EmbedBuilder()
    .setColor(Colors.category.overall)
    .setTitle("Role Selection")
    .setDescription(
      "React to this message to receive notification roles.\nRemove your reaction to lose the role.\n\n" +
      lines.join("\n")
    );

  if (rc.messageId) {
    try {
      const existing = await channel.messages.fetch(rc.messageId);
      await existing.edit({ embeds: [embed] });
      return;
    } catch {
      /* message gone, send a new one */
    }
  }

  const sent = await channel.send({ embeds: [embed] });

  for (const entry of Object.values(rc.roles)) {
    await sent.react(entry.emoji);
  }

  rc.messageId = sent.id;
  const configPath = resolve(process.cwd(), "config.json");
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  } catch {
    console.warn("Could not persist reactionRoles.messageId to config.json");
  }
}

export const messageReactionAdd = {
  name: Events.MessageReactionAdd,
  async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    const resolved = await resolveReaction(reaction);
    if (!resolved || user.bot) return;

    const rc = config.reactionRoles;
    if (!rc || resolved.message.id !== rc.messageId) return;

    const emoji = resolved.emoji.name;
    if (!emoji) return;

    const entry = getEntryByEmoji(emoji);
    if (!entry) return;

    const guild = resolved.message.guild;
    if (!guild) return;

    try {
      const member = await guild.members.fetch(user.id);
      await member.roles.add(entry.roleId);
    } catch (err) {
      console.error(`Failed to add role ${entry.roleId} to ${user.id}:`, err);
    }
  },
};

export const messageReactionRemove = {
  name: Events.MessageReactionRemove,
  async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    const resolved = await resolveReaction(reaction);
    if (!resolved || user.bot) return;

    const rc = config.reactionRoles;
    if (!rc || resolved.message.id !== rc.messageId) return;

    const emoji = resolved.emoji.name;
    if (!emoji) return;

    const entry = getEntryByEmoji(emoji);
    if (!entry) return;

    const guild = resolved.message.guild;
    if (!guild) return;

    try {
      const member = await guild.members.fetch(user.id);
      await member.roles.remove(entry.roleId);
    } catch (err) {
      console.error(`Failed to remove role ${entry.roleId} from ${user.id}:`, err);
    }
  },
};
