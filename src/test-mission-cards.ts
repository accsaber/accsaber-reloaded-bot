import { mkdirSync, writeFileSync } from "node:fs";
import {
  renderMissionCard,
  type MissionCardData,
} from "./utils/mission-card-renderer.js";

const USER = {
  id: "76561198012241978",
  name: "PulseLane",
  country: "US",
  avatarUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
};

const cards: { name: string; data: MissionCardData }[] = [
  {
    name: "extreme-daily-tech",
    data: {
      user: USER,
      mission: {
        id: "ms-1",
        name: "Tech Acc Trial",
        description: "Set a new PB on three Tech Acc maps with 96%+ accuracy.",
        type: "PB_ABOVE_THRESHOLD",
        pool: "daily",
        band: "extreme",
        xpAwarded: 2500,
      },
      title: "Just conquered an EXTREME daily mission!",
      category: { name: "Tech Acc", code: "tech_acc" },
      level: 72,
    },
  },
  {
    name: "extreme-weekly-cross-category",
    data: {
      user: USER,
      mission: {
        id: "ms-2",
        name: "Marathon Mastery",
        description: "Play 50 ranked maps in 7 days while maintaining 95%+ average accuracy.",
        type: "PLAY_N_MAPS",
        pool: "weekly",
        band: "extreme",
        xpAwarded: 7500,
      },
      title: "Just conquered an EXTREME weekly mission!",
      level: 88,
    },
  },
  {
    name: "extreme-snipe-standard",
    data: {
      user: USER,
      mission: {
        id: "ms-3",
        name: "Sniper Showdown",
        description: "Snipe a top-10 Standard Acc player on any ranked map.",
        type: "SNIPE_PLAYER_ON_MAP",
        pool: "daily",
        band: "extreme",
        xpAwarded: 3200,
      },
      title: "Just conquered an EXTREME daily mission!",
      category: { name: "Standard Acc", code: "standard_acc" },
      level: 105,
    },
  },
  {
    name: "extreme-no-xp",
    data: {
      user: USER,
      mission: {
        id: "ms-4",
        name: "Comeback King",
        description: "Reclaim a personal best you've held for over 30 days.",
        type: "COMEBACK_PB",
        pool: "weekly",
        band: "extreme",
      },
      title: "Just conquered an EXTREME weekly mission!",
      level: 45,
    },
  },
  {
    name: "extreme-streak-truacc",
    data: {
      user: USER,
      mission: {
        id: "ms-5",
        name: "True Acc Streak",
        description: "Hit a 12-map streak in True Acc without dropping below 97%.",
        type: "STREAK_N_IN_CATEGORY",
        pool: "weekly",
        band: "extreme",
        xpAwarded: 5000,
      },
      title: "Just conquered an EXTREME weekly mission!",
      category: { name: "True Acc", code: "true_acc" },
      level: 62,
    },
  },
  {
    name: "extreme-long-name",
    data: {
      user: USER,
      mission: {
        id: "ms-6",
        name: "The Extraordinarily Long Mission Name Test Case",
        description: "Make sure this gets truncated properly without breaking layout boundaries or wrapping past two lines.",
        type: "ACC_ON_MAP",
        pool: "daily",
        band: "extreme",
        xpAwarded: 1800,
      },
      title: "Just conquered an EXTREME daily mission!",
      category: { name: "Overall", code: "overall" },
      level: 30,
    },
  },
];

async function main() {
  mkdirSync("test-output", { recursive: true });

  for (const card of cards) {
    console.log(`Rendering ${card.name}...`);
    const result = await renderMissionCard(card.data);
    writeFileSync(`test-output/mission-${card.name}.png`, result.image);
    console.log(`  -> test-output/mission-${card.name}.png`);
  }

  console.log("\nDone! Check the test-output/ directory.");
}

main().catch(console.error);
