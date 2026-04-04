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
