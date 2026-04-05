import "dotenv/config";
import { ArBot } from "./client.js";
import { registerEvents } from "./events/index.js";
import { config } from "./config.js";
import { ScoreFeed } from "./services/score-feed.js";
import type { ScoreResponse } from "./types/api.js";
import commands from "./commands/index.js";

const BASE: ScoreResponse = {
  id: "test-base",
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
  rank: 50,
  rankWhenSet: 50,
  ap: 600,
  weightedAp: 600,
  blScoreId: 23803264,
  maxCombo: 500,
  badCuts: 0,
  misses: 0,
  wallHits: 0,
  bombHits: 0,
  pauses: 0,
  streak115: 0,
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
  return { ...BASE, id: `test-${Date.now()}-${Math.random()}`, ...overrides };
}

const TESTS: { name: string; score: ScoreResponse }[] = [
  {
    name: "Rank #1 (should trigger rankOne, suppress streak)",
    score: mock({ rank: 1, rankWhenSet: 1, ap: 1003.74, accuracy: 0.9930821122, streak115: 9 }),
  },
  {
    name: "All scores above threshold (ap >= 1060, should trigger allScoresAbove, suppress firstMilestone)",
    score: mock({ ap: 1070.38, accuracy: 0.9961787912, rank: 1 }),
  },
  {
    name: "Streak on standard_acc (9x 115, rank > 1 so streak fires)",
    score: mock({
      streak115: 12,
      ap: 850,
      accuracy: 0.985,
      rank: 10,
      categoryId: "b0000000-0000-0000-0000-000000000002",
    }),
  },
  {
    name: "Streak on tech_acc (9x 115)",
    score: mock({
      streak115: 11,
      ap: 750,
      accuracy: 0.975,
      rank: 20,
      categoryId: "b0000000-0000-0000-0000-000000000003",
    }),
  },
  {
    name: "Underdog (rank 3 on map, low category rank player)",
    score: mock({
      userId: "76561199407393962",
      userName: "pleb",
      avatarUrl: "https://cdn.assets.beatleader.com/76561199407393962R24.png",
      rank: 3,
      ap: 689.18,
      accuracy: 0.9784646032,
    }),
  },
  {
    name: "Rank #1 with snipe info",
    score: mock({
      rank: 1,
      rankWhenSet: 1,
      ap: 1050,
      accuracy: 0.9955,
      streak115: 7,
    }),
  },
  {
    name: "Score with misses (no FC)",
    score: mock({
      rank: 5,
      ap: 900,
      accuracy: 0.98,
      misses: 2,
      badCuts: 1,
      streak115: 4,
    }),
  },
];

const testName = process.argv[2];

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN required");
if (!config.scoreFeed) throw new Error("scoreFeed config required");

const client = new ArBot();
client.commands = commands;
registerEvents(client);

client.once("ready", async () => {
  console.log(`Ready as ${client.user?.tag}\n`);

  const feed = new ScoreFeed(client);
  const toRun = testName
    ? TESTS.filter((t) => t.name.toLowerCase().includes(testName.toLowerCase()))
    : TESTS;

  if (toRun.length === 0) {
    console.log("No matching tests. Available:");
    TESTS.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));
    process.exit(1);
  }

  for (const test of toRun) {
    console.log(`--- ${test.name} ---`);
    try {
      await feed.handleScore(test.score);
      console.log("  Sent.\n");
    } catch (err) {
      console.error("  Error:", err, "\n");
    }
  }

  console.log("Done. Exiting in 3s...");
  setTimeout(() => process.exit(0), 3000);
});

client.login(token);
