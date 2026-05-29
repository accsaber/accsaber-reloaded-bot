export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ScoreResponse {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string;
  country: string;
  mapDifficultyId: string;
  mapId: string;
  songName: string;
  songAuthor: string;
  mapAuthor: string;
  coverUrl: string;
  difficulty: "EASY" | "NORMAL" | "HARD" | "EXPERT" | "EXPERT_PLUS";
  categoryId: string;
  score: number;
  scoreNoMods: number;
  accuracy: number;
  rank: number;
  rankWhenSet: number;
  ap: number;
  weightedAp: number;
  blScoreId: number;
  maxCombo: number;
  badCuts: number;
  misses: number;
  wallHits: number;
  bombHits: number;
  pauses: number;
  streak115: number;
  playCount: number;
  hmd: string;
  timeSet: string;
  reweightDerivative: boolean;
  xpGained: number;
  baseXp: number;
  bonusXp: number;
  modifierIds: string[];
  createdAt: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  code: string;
  description: string;
  countForOverall: boolean;
}

export interface UserCategoryStatisticsResponse {
  id: string;
  userId: string;
  categoryId: string;
  ranking: number;
  countryRanking: number;
  ap: number;
  rankedPlays: number;
  averageAcc: number;
  averageAp: number;
  scoreXp: number;
  topPlayId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapDifficultyResponse {
  id: string;
  mapId: string;
  songName: string;
  songAuthor: string;
  mapAuthor: string;
  coverUrl: string;
  categoryId: string;
  difficulty: string;
  characteristic: string;
  complexity: number;
  active: boolean;
  maxScore: number;
  rankedAt: string;
}

export interface LeaderboardEntry {
  ranking: number;
  userId: string;
  userName: string;
  ap: number;
}

export interface StatsDiffResponse {
  categoryId: string;
  rankingDiff: number;
  countryRankingDiff: number;
  apDiff: number;
  rankedPlaysDiff: number;
  averageAccDiff: number;
  averageApDiff: number;
  scoreXpDiff: number;
  from: string;
  to: string;
}

export interface DiscordLinkResponse {
  discordId: string;
  userId: string;
  playerName: string;
  createdAt: string;
}

export interface LevelResponse {
  level: number;
  title: string;
  totalXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export interface LevelThreshold {
  level: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  id: string;
  name: string;
  avatarUrl: string;
  country: string;
  banned: boolean;
  ssInactive: boolean;
  hmd: string;
  createdAt: string;
}

export interface UserAllStatisticsResponse {
  totalXp: number;
  totalScoreXp: number;
  totalMilestoneXp: number;
  totalMilestoneSetBonusXp: number;
  categories: UserCategoryStatisticsResponse[];
}

export type MilestoneTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "apex";

export type MilestoneType = "milestone" | "achievement";

export interface MilestonePayloadEntry {
  id: string;
  setId: string;
  categoryId: string | null;
  title: string;
  description: string;
  type: MilestoneType;
  tier: MilestoneTier;
  xp: number;
  awardsItemId: string | null;
}

export interface MilestoneSetPayloadEntry {
  id: string;
  title: string;
  description: string;
  bonusXp: number;
  awardsItemId: string | null;
}

export interface MilestoneCompletedPayload {
  userId: string;
  userName: string;
  userCountry: string;
  userAvatarUrl: string;
  completedAt: string;
  milestones?: MilestonePayloadEntry[];
  sets?: MilestoneSetPayloadEntry[];
}

export interface MilestoneCompletionResponse {
  id: string;
  setId: string;
  categoryId: string | null;
  title: string;
  description: string;
  type: MilestoneType;
  tier: MilestoneTier;
  xp: number;
  completions: number;
  totalPlayers: number;
  completionPercentage: number;
}

export interface MilestoneHolderResponse {
  userId: string;
  userName: string;
  avatarUrl: string;
  country: string;
  completedAt: string;
}

export type MissionType =
  | "PLAY_N_MAPS"
  | "XP_IN_WINDOW"
  | "ACC_ON_MAP"
  | "AP_ON_MAP"
  | "PB_SPECIFIC_MAP"
  | "PB_ABOVE_THRESHOLD"
  | "SNIPE_PLAYER_ON_MAP"
  | "STREAK_ON_MAP"
  | "STREAK_N_IN_CATEGORY"
  | "COMEBACK_PB"
  | "SCORES_N";

export type MissionPool = "daily" | "weekly" | string;
export type MissionBand = "easy" | "medium" | "hard" | "extreme";

export interface MissionCompletedPayload {
  userId: string;
  userName: string;
  userCountry?: string;
  userAvatarUrl?: string;
  completedAt: string;
  missionId: string;
  templateId: string;
  templateCode: string;
  templateName: string;
  templateDescription: string;
  type: MissionType;
  pool: MissionPool;
  band: MissionBand;
  categoryId?: string;
  categoryCode?: string;
  targetMapDifficultyId?: string;
  xpAwarded?: number;
  itemAwardedId?: string;
}
