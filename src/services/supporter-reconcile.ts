import type { Guild } from "discord.js";
import { ApiError } from "../api/client.js";
import { getDiscordLink } from "../api/discord-links.js";
import {
  getUserSupporterState,
  type SupporterTierCode,
} from "../api/supporters.js";
import type { ArBot } from "../client.js";
import { config } from "../config.js";

export interface ReconcileSummary {
  scanned: number;
  revoked: number;
  revokedByTier: Record<string, number>;
  skippedUnlinked: number;
  errors: number;
}

function tierCodeFromName(name: string): SupporterTierCode | null {
  const lower = name.toLowerCase();
  if (lower === "bronze" || lower === "silver" || lower === "gold") {
    return lower;
  }
  return null;
}

export async function reconcileSupporterRoles(
  client: ArBot,
  options?: { dmOnRevoke?: boolean }
): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    scanned: 0,
    revoked: 0,
    revokedByTier: {},
    skippedUnlinked: 0,
    errors: 0,
  };

  const supporters = config.supporters;
  if (!supporters?.enabled) {
    console.warn("[Reconcile] Supporters not enabled — skipping");
    return summary;
  }

  const guild = await client.guilds.fetch(config.guildId);
  await guild.members.fetch();

  for (const [roleId, tierName] of Object.entries(supporters.roles)) {
    const role = await guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      console.warn(`[Reconcile] Role ${roleId} (${tierName}) not found`);
      continue;
    }

    const expectedTierCode = tierCodeFromName(tierName);
    if (!expectedTierCode) {
      console.warn(
        `[Reconcile] Unknown tier name ${tierName} for role ${roleId} — skipping`
      );
      continue;
    }

    const members = Array.from(role.members.values());
    for (const member of members) {
      summary.scanned++;
      try {
        const link = await getDiscordLink(member.id).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        });

        if (!link) {
          summary.skippedUnlinked++;
          console.info(
            `[Reconcile] Unlinked Discord ${member.id} has ${tierName} role — leaving alone`
          );
          continue;
        }

        const state = await getUserSupporterState(link.userId);
        if (state.currentTier === expectedTierCode) continue;

        await member.roles.remove(roleId, "Supporter tier reconciliation");
        summary.revoked++;
        summary.revokedByTier[tierName] =
          (summary.revokedByTier[tierName] ?? 0) + 1;
        console.log(
          `[Reconcile] Revoked ${tierName} from ${member.id}: backend tier is ${state.currentTier ?? "none"}`
        );

        if (options?.dmOnRevoke) {
          try {
            await member.send(
              "Your AccSaber supporter tier has lapsed. Your items are yours to keep — thanks for the support."
            );
          } catch (dmErr) {
            console.warn(
              `[Reconcile] Could not DM ${member.id} about revoke:`,
              dmErr
            );
          }
        }
      } catch (err) {
        summary.errors++;
        console.error(
          `[Reconcile] Failed for ${member.id} (${tierName}):`,
          err
        );
      }
    }
  }

  return summary;
}

export function formatReconcileSummary(s: ReconcileSummary): string {
  const tiers = ["Bronze", "Silver", "Gold"]
    .map((t) => `${t.toLowerCase()}: ${s.revokedByTier[t] ?? 0}`)
    .join(", ");
  return `Reconciled ${s.scanned} members. Revoked: ${s.revoked} (${tiers}). Skipped (unlinked): ${s.skippedUnlinked}. Errors: ${s.errors}.`;
}

function msUntilNext0500Utc(now: Date = new Date()): number {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      5,
      0,
      0,
      0
    )
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function scheduleSupporterReconciliation(client: ArBot): void {
  const tick = async () => {
    try {
      const summary = await reconcileSupporterRoles(client, {
        dmOnRevoke: true,
      });
      console.log(`[Reconcile] Daily run complete — ${formatReconcileSummary(summary)}`);
    } catch (err) {
      console.error("[Reconcile] Daily run failed:", err);
    } finally {
      setTimeout(tick, msUntilNext0500Utc());
    }
  };
  setTimeout(tick, msUntilNext0500Utc());
  console.log(
    `[Reconcile] Next run in ${Math.round(msUntilNext0500Utc() / 60000)} min`
  );
}
