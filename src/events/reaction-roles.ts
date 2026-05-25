import { EmbedBuilder, Events, type MessageReaction, type PartialMessageReaction, type PartialUser, type User } from "discord.js";
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
  if (!rc || !rc.channelId) {
    console.warn("[ReactionRoles] No reactionRoles config or channelId - skipping");
    return;
  }

  console.log(`[ReactionRoles] Fetching channel ${rc.channelId}...`);
  const channel = await client.channels.fetch(rc.channelId);
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    console.warn(`[ReactionRoles] Channel ${rc.channelId} not found or not a text channel`);
    return;
  }

  const lines = Object.values(rc.roles).map(
    (r) => `${r.emoji}  -  **${r.label}**`
  );

  const embed = new EmbedBuilder()
    .setColor(Colors.category.overall)
    .setTitle("Role Selection")
    .setDescription(
      "React to this message to receive server roles.\nRemove your reaction to lose the role.\n\n" +
      lines.join("\n")
    );

  const messages = await channel.messages.fetch({ limit: 1 });
  const existing = messages.first();

  const target = existing
    ? await existing.edit({ embeds: [embed] })
    : await channel.send({ embeds: [embed] });

  for (const entry of Object.values(rc.roles)) {
    const already = target.reactions.cache.some(
      (r) => r.emoji.name === entry.emoji && r.me
    );
    if (already) continue;
    try {
      await target.react(entry.emoji);
    } catch (err) {
      console.error(`[ReactionRoles] Failed to react with ${entry.emoji}:`, err);
    }
  }
}

export const messageReactionAdd = {
  name: Events.MessageReactionAdd,
  async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    const resolved = await resolveReaction(reaction);
    if (!resolved || user.bot) return;

    const rc = config.reactionRoles;
    if (!rc || resolved.message.channelId !== rc.channelId) return;

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
    if (!rc || resolved.message.channelId !== rc.channelId) return;

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
