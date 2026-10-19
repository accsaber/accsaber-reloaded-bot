import type { GuildMember } from "discord.js";
import type { Config, LevelTierRoles } from "../types/config.js";
import { Colors } from "./embeds.js";

export interface LevelTier {
  name: keyof LevelTierRoles;
  min: number;
  max: number;
  color: number;
}

export const LEVEL_TIERS: LevelTier[] = [
  { name: "newcomer", min: 1, max: 9, color: Colors.levelTier.newcomer },
  { name: "apprentice", min: 10, max: 19, color: Colors.levelTier.apprentice },
  { name: "adept", min: 20, max: 29, color: Colors.levelTier.adept },
  { name: "skilled", min: 30, max: 39, color: Colors.levelTier.skilled },
  { name: "expert", min: 40, max: 49, color: Colors.levelTier.expert },
  { name: "master", min: 50, max: 59, color: Colors.levelTier.master },
  { name: "grandmaster", min: 60, max: 69, color: Colors.levelTier.grandmaster },
  { name: "legend", min: 70, max: 79, color: Colors.levelTier.legend },
  { name: "transcendent", min: 80, max: 89, color: Colors.levelTier.transcendent },
  { name: "mythic", min: 90, max: 99, color: Colors.levelTier.mythic },
  { name: "ascendant", min: 100, max: 119, color: Colors.levelTier.ascendant },
  { name: "fabled", min: 120, max: 139, color: Colors.levelTier.fabled },
  { name: "exalted", min: 140, max: 159, color: Colors.levelTier.exalted },
  { name: "titanic", min: 160, max: 179, color: Colors.levelTier.titanic },
  { name: "promethean", min: 180, max: 199, color: Colors.levelTier.promethean },
  { name: "supreme", min: 200, max: Infinity, color: Colors.levelTier.supreme },
];

export function getTierForLevel(level: number): LevelTier | undefined {
  return LEVEL_TIERS.find((t) => level >= t.min && level <= t.max);
}

export interface RoleSyncResult {
  tier: LevelTier;
  added: boolean;
  removed: string[];
}

export async function syncLevelRoles(
  member: GuildMember,
  level: number,
  configRoles: Config["roles"]
): Promise<RoleSyncResult | null> {
  const tier = getTierForLevel(level);
  if (!tier) return null;

  const allTierRoleIds = Object.values(configRoles.levelTiers).filter(Boolean);
  const correctRoleId = configRoles.levelTiers[tier.name];

  const currentTierRoles = member.roles.cache.filter((r) =>
    allTierRoleIds.includes(r.id)
  );

  const wrongRoles = currentTierRoles.filter((r) => r.id !== correctRoleId);
  const hasCorrectRole = currentTierRoles.has(correctRoleId);

  const removed: string[] = [];
  for (const [, role] of wrongRoles) {
    await member.roles.remove(role);
    removed.push(role.name);
  }

  let added = false;
  if (!hasCorrectRole && correctRoleId) {
    await member.roles.add(correctRoleId);
    added = true;
  }

  return { tier, added, removed };
}
