import { mkdirSync, writeFileSync } from "node:fs";
import {
  renderProfileCard,
  type ProfileCardData,
} from "./utils/card-renderer.js";
import type { ScoreResponse } from "./types/api.js";

const CAT_STD = "b0000000-0000-0000-0000-000000000002";
const CAT_TECH = "b0000000-0000-0000-0000-000000000003";
const CAT_TRUE = "b0000000-0000-0000-0000-000000000001";

const categoryIdToCode: Record<string, string> = {
  [CAT_STD]: "standard_acc",
  [CAT_TECH]: "tech_acc",
  [CAT_TRUE]: "true_acc",
};

function mockScore(overrides: Partial<ScoreResponse>): ScoreResponse {
  const base: ScoreResponse = {
    id: "s-base",
    userId: "76561198012241978",
    userName: "PulseLane",
    avatarUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
    country: "US",
    mapDifficultyId: "d676bb80-d5e0-4d3e-886c-715d81755100",
    mapId: "be585daf-059f-41d4-8e42-f25ded1e480a",
    songName: "Wildcard",
    songAuthor: "Mickey Valen",
    mapAuthor: "Tranch",
    coverUrl: "https://eu.cdn.beatsaver.com/35b125930b0f475431afcff0362711d98cfeeaa6.jpg",
    difficulty: "HARD",
    categoryId: CAT_STD,
    score: 329023,
    scoreNoMods: 329023,
    accuracy: 0.9930821122,
    rank: 5,
    rankWhenSet: 5,
    ap: 942.55,
    weightedAp: 905.4,
    blScoreId: 23803264,
    maxCombo: 500,
    badCuts: 0,
    misses: 0,
    wallHits: 0,
    bombHits: 0,
    pauses: 0,
    streak115: 7,
    playCount: 5,
    hmd: "Index",
    timeSet: new Date(Date.now() - 86_400_000 * 3).toISOString(),
    reweightDerivative: false,
    xpGained: 680,
    baseXp: 25,
    bonusXp: 655,
    modifierIds: [],
    createdAt: new Date().toISOString(),
  };
  return { ...base, ...overrides };
}

const cards: { name: string; data: ProfileCardData }[] = [
  {
    name: "overall-top",
    data: {
      name: "PulseLane",
      avatarUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
      country: "US",
      categoryCode: "overall",
      level: {
        level: 72,
        title: "Legend",
        totalXp: 982_400,
        xpForCurrentLevel: 320_000,
        xpForNextLevel: 500_000,
        progressPercent: 64,
      },
      stats: {
        id: "x",
        userId: "76561198012241978",
        categoryId: "overall",
        ranking: 14,
        countryRanking: 3,
        ap: 12842.55,
        rankedPlays: 482,
        averageAcc: 0.9712,
        averageAp: 712.4,
        scoreXp: 0,
        topPlayId: "x",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      diff: {
        categoryId: "overall",
        rankingDiff: 2,
        countryRankingDiff: 0,
        apDiff: 12.4,
        rankedPlaysDiff: 1,
        averageAccDiff: 0.0008,
        averageApDiff: 0.6,
        scoreXpDiff: 0,
        from: new Date().toISOString(),
        to: new Date().toISOString(),
      },
      topScores: [
        mockScore({ id: "1", rank: 1, ap: 1003.74, accuracy: 0.9930, songName: "Wildcard", categoryId: CAT_STD }),
        mockScore({ id: "2", rank: 2, ap: 950.17, accuracy: 0.9905, songName: "RTX-OFF", songAuthor: "Camellia", mapAuthor: "Joetastic", categoryId: CAT_TECH, difficulty: "EXPERT_PLUS", misses: 1, badCuts: 0 }),
        mockScore({ id: "3", rank: 3, ap: 920.50, accuracy: 0.9880, songName: "Mesmerizer", songAuthor: "32ki", mapAuthor: "Dack", categoryId: CAT_STD }),
        mockScore({ id: "4", rank: 14, ap: 880.00, accuracy: 0.985, songName: "Reality Check Through The Skull", songAuthor: "Denzel Curry", mapAuthor: "Spookii", categoryId: CAT_TECH, timeSet: new Date(Date.now() - 86_400_000 * 30).toISOString() }),
        mockScore({ id: "5", rank: 7, ap: 845.00, accuracy: 0.983, songName: "Tonight, Tonight", songAuthor: "Smashing Pumpkins", mapAuthor: "Kival Evan", categoryId: CAT_TRUE, timeSet: new Date(Date.now() - 86_400_000 * 200).toISOString() }),
      ],
      scoresLabel: "TOP SCORES",
      categoryIdToCode,
    },
  },
  {
    name: "tech-acc-newcomer",
    data: {
      name: "pleb",
      avatarUrl: "https://cdn.assets.beatleader.com/76561199407393962R24.png",
      country: "DE",
      categoryCode: "tech_acc",
      level: {
        level: 12,
        title: "Apprentice",
        totalXp: 4_200,
        xpForCurrentLevel: 1_200,
        xpForNextLevel: 6_000,
        progressPercent: 20,
      },
      stats: {
        id: "x",
        userId: "76561199407393962",
        categoryId: CAT_TECH,
        ranking: 1311,
        countryRanking: 84,
        ap: 312.18,
        rankedPlays: 28,
        averageAcc: 0.9521,
        averageAp: 110.2,
        scoreXp: 0,
        topPlayId: "x",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      diff: {
        categoryId: CAT_TECH,
        rankingDiff: -8,
        countryRankingDiff: -2,
        apDiff: -3.1,
        rankedPlaysDiff: 0,
        averageAccDiff: -0.0003,
        averageApDiff: -0.2,
        scoreXpDiff: 0,
        from: new Date().toISOString(),
        to: new Date().toISOString(),
      },
      topScores: [
        mockScore({ id: "1", rank: 8, ap: 410.18, accuracy: 0.965, songName: "$$$", songAuthor: "Adventure Club", mapAuthor: "Nuke", categoryId: CAT_TECH, difficulty: "EXPERT" }),
        mockScore({ id: "2", rank: 15, ap: 380.00, accuracy: 0.96, songName: "Bumblebee", songAuthor: "BlackY", mapAuthor: "Joetastic", categoryId: CAT_TECH, misses: 3, badCuts: 1 }),
        mockScore({ id: "3", rank: 22, ap: 340.00, accuracy: 0.955, songName: "100 Mph", songAuthor: "BlackY", mapAuthor: "Bytrius", categoryId: CAT_TECH }),
      ],
      scoresLabel: "TOP SCORES - TECH ACC",
      categoryIdToCode,
    },
  },
];

async function main() {
  mkdirSync("test-output", { recursive: true });

  for (const card of cards) {
    console.log(`Rendering profile-${card.name}...`);
    const buf = await renderProfileCard(card.data);
    writeFileSync(`test-output/profile-${card.name}.png`, buf);
    console.log(`  -> test-output/profile-${card.name}.png`);
  }

  console.log("\nDone! Check the test-output/ directory.");
}

main().catch(console.error);
