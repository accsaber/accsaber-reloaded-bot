export interface MilestoneThresholdConfig {
  ap: number;
  enabled: boolean;
  messageTemplate: string;
  embedColor?: string;
}

export interface FirstMilestoneConfig {
  enabled: boolean;
  embedColor: string;
  thresholds: MilestoneThresholdConfig[];
}

export interface AllScoresAboveConfig {
  enabled: boolean;
  apThreshold: number;
  messageTemplate: string;
  embedColor: string;
}

export interface UnderdogConfig {
  enabled: boolean;
  mapRankThreshold: number;
  minCategoryRank: number;
  messageTemplate: string;
  embedColor: string;
}

export interface RankOneConfig {
  enabled: boolean;
  messageTemplate: string;
  embedColor: string;
}

export interface TopRankThresholdConfig {
  rank: number;
  enabled: boolean;
  messageTemplate: string;
}

export interface TopRankCategoryConfig {
  categoryCode: string;
  embedColor: string;
}

export interface TopRankConfig {
  enabled: boolean;
  categories: TopRankCategoryConfig[];
  thresholds: TopRankThresholdConfig[];
  detailThreshold: number;
  detailMessageTemplate: string;
}

export interface StreakCategoryConfig {
  categoryCode: string;
  threshold: number;
}

export interface StreakConfig {
  enabled: boolean;
  categoryThresholds: StreakCategoryConfig[];
  messageTemplate: string;
  embedColor: string;
}

export interface ScoreFeedConfig {
  channelId: string;
  wsUrl?: string;
  reconnectIntervalMs?: number;
  firstMilestone: FirstMilestoneConfig;
  allScoresAbove: AllScoresAboveConfig;
  underdog: UnderdogConfig;
  rankOne: RankOneConfig;
  topRank: TopRankConfig;
  streak: StreakConfig;
}

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
  scoreFeed?: ScoreFeedConfig;
}
