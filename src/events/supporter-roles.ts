import {
  DiscordAPIError,
  Events,
  type GuildMember,
  type PartialGuildMember,
} from "discord.js";
import { ApiError } from "../api/client.js";

const DM_BLOCKED_CODES = new Set([50007, 50278]);
const isDmBlocked = (err: unknown): boolean =>
  err instanceof DiscordAPIError && DM_BLOCKED_CODES.has(Number(err.code));
import { claimSupporterByRole } from "../api/supporters.js";
import { config } from "../config.js";
import { WEBSITE_URL } from "../utils/embeds.js";

export const supporterRoleListener = {
  name: Events.GuildMemberUpdate,
  async execute(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember
  ) {
    const supporters = config.supporters;
    if (!supporters?.enabled) return;
    if (newMember.guild.id !== config.guildId) return;

    const oldRoles = new Set(oldMember.roles.cache.keys());
    const addedRoles: string[] = [];
    for (const roleId of newMember.roles.cache.keys()) {
      if (!oldRoles.has(roleId)) addedRoles.push(roleId);
    }
    if (addedRoles.length === 0) return;

    const matchedTiers: { roleId: string; tier: string }[] = [];
    for (const roleId of addedRoles) {
      const tier = supporters.roles[roleId];
      if (tier) matchedTiers.push({ roleId, tier });
    }
    if (matchedTiers.length === 0) return;

    let dmSent = false;
    for (const { roleId, tier } of matchedTiers) {
      try {
        const result = await claimSupporterByRole({
          discordId: newMember.id,
          tierName: tier,
          assignedAt: new Date().toISOString(),
        });
        if (!result.matched) {
          console.info(
            `[Supporters] No unclaimed Ko-fi event for ${newMember.id} tier=${tier} role=${roleId}`
          );
          continue;
        }
        console.log(
          `[Supporters] Claimed ${tier} for ${newMember.id} (txn ${result.kofiTransactionId})`
        );
        if (supporters.notifyDmOnClaim) {
          try {
            await newMember.send(
              `Thanks for supporting AccSaber! Your **${tier}** tier is active. Visit your profile to equip your new items.`
            );
          } catch (err) {
            if (isDmBlocked(err)) {
              console.info(
                `[Supporters] DMs closed for ${newMember.id}; skipped claim notice`
              );
            } else {
              console.warn(
                `[Supporters] Could not DM ${newMember.id} after claim:`,
                err
              );
            }
          }
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          console.info(
            `[Supporters] Discord ${newMember.id} not linked; cannot claim ${tier}`
          );
          if (supporters.notifyDmOnUnlinked && !dmSent) {
            dmSent = true;
            try {
              await newMember.send(
                `Sign in at ${WEBSITE_URL} with Discord to link your account and claim your supporter perks.`
              );
            } catch (dmErr) {
              if (isDmBlocked(dmErr)) {
                console.info(
                  `[Supporters] DMs closed for ${newMember.id}; skipped link prompt`
                );
              } else {
                console.warn(
                  `[Supporters] Could not DM ${newMember.id} about linking:`,
                  dmErr
                );
              }
            }
          }
          continue;
        }
        console.error(
          `[Supporters] Failed to claim ${tier} for ${newMember.id}:`,
          err
        );
      }
    }
  },
};
