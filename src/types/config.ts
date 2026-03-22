export interface LevelTierRoles {
  newcomer: string;
  apprentice: string;
  adept: string;
  skilled: string;
  expert: string;
  master: string;
  grandmaster: string;
  legend: string;
  transcendent: string;
  mythic: string;
  ascendant: string;
}

export interface ReactionRoleEntry {
  emoji: string;
  roleId: string;
  label: string;
}

export interface ReactionRolesConfig {
  channelId: string;
  messageId?: string;
  roles: Record<string, ReactionRoleEntry>;
}

export interface Config {
  clientId: string;
  guildId: string;
  allowedChannels: string[];
  api: {
    baseUrl: string;
    cacheTtlMs: number;
  };
  roles: {
    player: string;
    levelTiers: LevelTierRoles;
  };
  reactionRoles?: ReactionRolesConfig;
}
