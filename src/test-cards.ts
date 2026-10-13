import { writeFileSync, mkdirSync } from "node:fs";
import { renderFeedCard, type FeedCardData } from "./utils/feed-card-renderer.js";
import type { ScoreResponse } from "./types/api.js";

const BASE: ScoreResponse = {
  id: "test",
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
  categoryId: "b0000000-0000-0000-0000-000000000002",
  score: 329023,
  scoreNoMods: 329023,
  accuracy: 0.9930821122,
  rank: 1,
  rankWhenSet: 1,
  ap: 1003.744065,
  weightedAp: 0.914749,
  blScoreId: 23803264,
  maxCombo: 500,
  badCuts: 0,
  misses: 0,
  wallHits: 0,
  bombHits: 0,
  pauses: 0,
  streak115: 9,
  playCount: 5,
  hmd: "Index",
  timeSet: new Date().toISOString(),
  reweightDerivative: false,
  xpGained: 680,
  baseXp: 25,
  bonusXp: 655,
  modifierIds: [],
  createdAt: new Date().toISOString(),
};

function mock(overrides: Partial<ScoreResponse>): ScoreResponse {
  return { ...BASE, ...overrides };
}

const cards: { name: string; data: FeedCardData }[] = [
  {
    name: "rank-one",
    data: {
      score: mock({ rank: 1, ap: 1003.74, accuracy: 0.9930, streak115: 9 }),
      title: "Took #1 on this map",
      accentColor: "#ffd700",
      categoryCode: "standard_acc",
      categoryName: "Standard Acc",
      level: 72,
      complexity: 7.2,
      extraInfo: "Sniped OlbmaPhlee, who had 1039.09 AP at 99.21%",
    },
  },
  {
    name: "massive-score",
    data: {
      score: mock({ rank: 1, ap: 1070.38, accuracy: 0.9961, streak115: 12 }),
      title: "Set a 1003.74 AP score",
      accentColor: "#ef4444",
      categoryCode: "standard_acc",
      categoryName: "Standard Acc",
      level: 72,
      complexity: 7.2,
    },
  },
  {
    name: "first-milestone-ever",
    data: {
      score: mock({ rank: 5, ap: 1003.74, accuracy: 0.9930, streak115: 7 }),
      title: "First 1000+ AP score ever",
      accentColor: "#ffd700",
      categoryCode: "standard_acc",
      categoryName: "Standard Acc",
      level: 72,
      complexity: 7.2,
    },
  },
  {
    name: "first-milestone-category",
    data: {
      score: mock({ rank: 8, ap: 712.50, accuracy: 0.9800, streak115: 3 }),
      title: "First 700+ AP score in Tech Acc",
      accentColor: "#ffd700",
      categoryCode: "tech_acc",
      categoryName: "Tech Acc",
      level: 72,
      complexity: 5.8,
    },
  },
  {
    name: "underdog",
    data: {
      score: mock({
        userId: "76561199407393962",
        userName: "pleb",
        avatarUrl: "https://cdn.assets.beatleader.com/76561199407393962R24.png",
        rank: 3,
        ap: 689.18,
        accuracy: 0.9784,
        streak115: 2,
      }),
      title: "Got #3 on this map while sitting #1311 in Standard Acc",
      accentColor: "#22c55e",
      categoryCode: "standard_acc",
      categoryName: "Standard Acc",
      level: 15,
      complexity: 7.2,
    },
  },
  {
    name: "streak",
    data: {
      score: mock({ rank: 10, ap: 850, accuracy: 0.985, streak115: 14 }),
      title: "Hit a 14 note 115 streak",
      accentColor: "#a855f7",
      categoryCode: "standard_acc",
      categoryName: "Standard Acc",
      level: 72,
      complexity: 7.2,
    },
  },
  {
    name: "top-rank-detail",
    data: {
      score: mock({ rank: 2, ap: 950, accuracy: 0.990, streak115: 6 }),
      title: "Now #7 in Overall",
      accentColor: "#a855f7",
      categoryCode: "overall",
      categoryName: "Overall",
      level: 72,
      complexity: 7.2,
      subtitle: "Moved from #9 to #7 in Overall - Passed Kira",
    },
  },
  {
    name: "top-rank-threshold",
    data: {
      score: mock({ rank: 4, ap: 880, accuracy: 0.988, streak115: 5 }),
      title: "Entered the top 25 in Tech Acc",
      accentColor: "#ef4444",
      categoryCode: "tech_acc",
      categoryName: "Tech Acc",
      level: 72,
      complexity: 9.1,
      subtitle: "Now #24 in Tech Acc - Passed SomePlayer",
    },
  },
  {
    name: "misses",
    data: {
      score: mock({ rank: 5, ap: 900, accuracy: 0.98, misses: 2, badCuts: 1, streak115: 4 }),
      title: "Set a 1003.74 AP score",
      accentColor: "#ef4444",
      categoryCode: "standard_acc",
      categoryName: "Standard Acc",
      level: 72,
      complexity: 7.2,
    },
  },
];

async function main() {
  mkdirSync("test-output", { recursive: true });

  for (const card of cards) {
    console.log(`Rendering ${card.name}...`);
    const result = await renderFeedCard(card.data);
    writeFileSync(`test-output/${card.name}.png`, result.image);
    console.log(`  -> test-output/${card.name}.png`);
  }

  console.log("\nDone! Check the test-output/ directory.");
}

main().catch(console.error);
