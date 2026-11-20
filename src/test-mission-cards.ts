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
        name: "Tech Acc Trial",
        description: "Set a new PB on three Tech Acc maps with 96%+ accuracy.",
        band: "extreme",
        xpAwarded: 2500,
      },
      title: "Beat an extreme daily mission!",
      category: { name: "Tech Acc", code: "tech_acc" },
      level: 72,
    },
  },
  {
    name: "extreme-weekly-cross-category",
    data: {
      user: USER,
      mission: {
        name: "Marathon Mastery",
        description: "Play 50 ranked maps in 7 days while maintaining 95%+ average accuracy.",
        band: "extreme",
        xpAwarded: 7500,
      },
      title: "Beat an extreme weekly mission!",
      level: 88,
    },
  },
  {
    name: "extreme-snipe-standard",
    data: {
      user: USER,
      mission: {
        name: "Sniper Showdown",
        description: "Snipe a top-10 Standard Acc player on any ranked map.",
        band: "extreme",
        xpAwarded: 3200,
      },
      title: "Beat an extreme daily mission!",
      category: { name: "Standard Acc", code: "standard_acc" },
      level: 105,
    },
  },
  {
    name: "extreme-no-xp",
    data: {
      user: USER,
      mission: {
        name: "Comeback King",
        description: "Reclaim a personal best you've held for over 30 days.",
        band: "extreme",
      },
      title: "Beat an extreme weekly mission!",
      level: 45,
    },
  },
  {
    name: "extreme-streak-truacc",
    data: {
      user: USER,
      mission: {
        name: "True Acc Streak",
        description: "Hit a 12-map streak in True Acc without dropping below 97%.",
        band: "extreme",
        xpAwarded: 5000,
      },
      title: "Beat an extreme weekly mission!",
      category: { name: "True Acc", code: "true_acc" },
      level: 62,
    },
  },
  {
    name: "extreme-long-name",
    data: {
      user: USER,
      mission: {
        name: "The Extraordinarily Long Mission Name Test Case",
        description: "Make sure this gets truncated properly without breaking layout boundaries or wrapping past two lines.",
        band: "extreme",
        xpAwarded: 1800,
      },
      title: "Beat an extreme daily mission!",
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
