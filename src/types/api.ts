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

export type ItemRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export interface ItemResponse {
  id: string;
  typeId: string;
  typeKey: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  value: Record<string, unknown> | null;
  rarity: ItemRarity;
  worth: number | null;
  requirement: string | null;
  unlockLevel: number | null;
  createdAt: string;
  tradeable: boolean;
  visible: boolean;
  active: boolean;
  deprecated: boolean;
  stackable: boolean;
  welcomeGrant: boolean;
  missionPoolable: boolean;
  downloadable: boolean;
  uniquePerUser: boolean;
  serialized: boolean;
}

export interface ItemModifierRef {
  id: string;
  key: string;
  name: string;
  colorHex: string | null;
  effectSpec: Record<string, unknown> | null;
}

export interface UnusualEffectRef {
  id: string;
  key: string;
  name: string;
  effectSpec: Record<string, unknown> | null;
}

export interface UserItemResponse {
  linkId: string;
  item: ItemResponse;
  modifiers: ItemModifierRef[];
  unusualEffect: UnusualEffectRef | null;
  serialNumber: number | null;
  quantity: number;
  counters: Record<string, number> | null;
  source: string;
  sourceId: string;
  awardedByStaffId: string | null;
  reason: string | null;
  awardedAt: string;
  variantKey: string | null;
}

export interface CrateOpenResponse {
  id: string;
  crate: ItemResponse;
  consumedLinkId: string;
  reward: UserItemResponse;
  rolledAt: string;
}

export interface CrateFeedUserRef {
  id: string;
  name: string;
  avatarUrl: string | null;
  cdnAvatarUrl: string | null;
  country: string | null;
}

export interface CrateFeedFrame {
  type: string;
  player: CrateFeedUserRef;
  open: CrateOpenResponse;
}

export type CampaignStatus = "DRAFT" | "PUBLISHED" | "EDITING" | "CURATED";
export type CampaignCompletionMode = "TERMINAL" | "ALL";
export type CampaignProgressStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
export type CampaignTagKind = "CATEGORY" | "DIFFICULTY" | "THEME" | "GENRE";
export type CampaignRequirementType =
  | "ACC"
  | "AP"
  | "SCORE"
  | "STREAK_115"
  | "FC"
  | "RANK"
  | "PASS"
  | "COMBO"
  | "BOMB_HITS";
export type CampaignTargetMode = "AND" | "OR";
export type CampaignModifierRequirement = "REQUIRED" | "FORBIDDEN";

export interface CampaignTagResponse {
  id: string;
  kind: CampaignTagKind;
  name: string;
  categoryId?: string;
  system: boolean;
}

export interface CampaignItemGrant {
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface CampaignResponse {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAlias?: string;
  name: string;
  slug: string;
  summary?: string;
  description?: string;
  status: CampaignStatus;
  seekingCuration: boolean;
  official: boolean;
  loved: boolean;
  progressionAgnostic: boolean;
  legacy: boolean;
  playlistExportEnabled: boolean;
  completionMode: CampaignCompletionMode;
  completionXp: number;
  backgroundUrl?: string;
  backgroundColor?: string;
  iconUrl?: string;
  difficultyCount: number;
  totalUpvotes: number;
  totalDownvotes: number;
  voteScore: number;
  tags: CampaignTagResponse[];
  completionItems: CampaignItemGrant[];
  submittedAt?: string;
  curatedAt?: string;
  lovedAt?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface CampaignNodeMetadata {
  bpm: number;
  notes: number;
  bombs: number;
  walls: number;
  duration: number;
}

export interface CampaignTargetResponse {
  id: string;
  requirementType: CampaignRequirementType;
  requirementValue?: number | null;
  requirementValueMax?: number | null;
}

export interface ModifierResponse {
  id: string;
  name: string;
  code: string;
  multiplier: number;
}

export interface CampaignModifierRequirementResponse {
  modifier: ModifierResponse;
  requirement: CampaignModifierRequirement;
}

export interface CampaignDifficultyResponse {
  id: string;
  mapDifficultyId: string;
  mapId: string;
  categoryId?: string;
  complexity?: number;
  nps?: number;
  beatsaverCode?: string;
  maxScore?: number;
  maxCombo?: number;
  metadata?: CampaignNodeMetadata;
  songName: string;
  songAuthor: string;
  mapAuthor: string;
  coverUrl?: string;
  cdnCoverUrl?: string;
  difficulty: "EASY" | "NORMAL" | "HARD" | "EXPERT" | "EXPERT_PLUS";
  characteristic: string;
  mapDifficultyStatus: "QUEUE" | "QUALIFIED" | "RANKED" | "CAMPAIGN";
  requirementType: CampaignRequirementType;
  requirementValue?: number | null;
  requirementValueMax?: number | null;
  targetMode?: CampaignTargetMode;
  targets?: CampaignTargetResponse[];
  prerequisiteMode: "AND" | "OR";
  description?: string;
  checkpointLabel?: string;
  checkpointAvatarUrl?: string;
  checkpointColor?: string;
  borderColor?: string;
  borderShape?: string;
  checkpointLabelPosition?: "LEFT" | "RIGHT" | "UP" | "DOWN" | "NONE";
  size?: number;
  checkpointSize?: number;
  positionX?: number;
  positionY?: number;
  xp: number;
  prerequisites: { comesFromCampaignDifficultyId: string; color?: string }[];
  items: CampaignItemGrant[];
  modifiers?: CampaignModifierRequirementResponse[];
}

export interface CampaignFeedUserRef {
  userId: string;
  userName: string;
  country?: string;
  avatarUrl?: string;
  cdnAvatarUrl?: string;
}

export interface CampaignFeedFrame {
  type: string;
  player?: CampaignFeedUserRef;
  campaign: CampaignResponse;
  node?: CampaignDifficultyResponse;
  completedAt: string;
}

export interface CampaignDifficultyProgressResponse {
  node: CampaignDifficultyResponse;
  userValue?: number | null;
  userScore?: number | null;
  completed: boolean;
  unlocked: boolean;
  pathCompleted: boolean;
  rewardsEarned: boolean;
}

export interface CampaignBarrierProgressResponse {
  barrier: {
    id: string;
    conditionType: string;
    conditionValue?: number;
    label?: string;
    xp?: number;
    items: CampaignItemGrant[];
  };
  currentValue?: number | null;
  satisfied: boolean;
  unlocked: boolean;
}

export interface CampaignCurrentMilestone {
  nodeId: string;
  label: string;
  depth: number;
}

export interface CampaignProgressResponse {
  id: string | null;
  campaign: CampaignResponse;
  progressStatus: CampaignProgressStatus | null;
  startedAt?: string | null;
  completedAt?: string | null;
  completedDifficulties: number;
  currentMilestone?: CampaignCurrentMilestone | null;
  difficulties: CampaignDifficultyProgressResponse[];
  barriers: CampaignBarrierProgressResponse[];
}
