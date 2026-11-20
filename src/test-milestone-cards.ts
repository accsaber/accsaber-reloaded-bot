import { mkdirSync, writeFileSync } from "node:fs";
import {
  renderMilestoneCard,
  renderMilestoneSetCard,
  type MilestoneCardData,
  type MilestoneSetCardData,
} from "./utils/milestone-card-renderer.js";

const USER = {
  id: "76561198012241978",
  name: "PulseLane",
  country: "US",
  avatarUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
};

const cards: { name: string; data: MilestoneCardData }[] = [
  {
    name: "first-ever-gold",
    data: {
      user: USER,
      milestone: {
        title: "Sub-13s",
        description: "Achieve an accuracy of 13% or higher on a Tech Acc map.",
        tier: "gold",
        iconGroup: "STREAK",
        xp: 500,
      },
      title: "The first player ever to unlock this milestone!",
      accentColor: "#FFD700",
      category: { name: "Tech Acc", code: "tech_acc" },
      level: 72,
    },
  },
  {
    name: "rare-platinum",
    data: {
      user: USER,
      milestone: {
        title: "Quintuple Crown",
        description: "Hold a top-5 rank in every category simultaneously.",
        tier: "platinum",
        iconGroup: "RANK",
        xp: 1500,
      },
      title: "Unlocked a rare achievement!",
      subtitle: "Only 0.42% of players have it",
      accentColor: "#9B59B6",
      level: 72,
    },
  },
  {
    name: "diamond-tier",
    data: {
      user: USER,
      milestone: {
        title: "Diamond Accuracy",
        description: "Reach 99.5% average accuracy across all Standard Acc maps.",
        tier: "diamond",
        iconGroup: "ACCURACY",
        xp: 2500,
      },
      title: "Unlocked a diamond milestone!",
      accentColor: "#5DADE2",
      category: { name: "Standard Acc", code: "standard_acc" },
      level: 88,
    },
  },
  {
    name: "apex-tier",
    data: {
      user: USER,
      milestone: {
        title: "Apex Predator",
        description: "Reach the #1 Overall ranking and hold it for a season.",
        tier: "apex",
        iconGroup: "AP",
        xp: 10000,
      },
      title: "Unlocked an apex achievement!",
      accentColor: "#5DADE2",
      level: 105,
    },
  },
  {
    name: "bronze-no-category",
    data: {
      user: USER,
      milestone: {
        title: "First Steps",
        description: "Submit your first ranked score.",
        tier: "bronze",
        iconGroup: "SCORE",
        xp: 50,
      },
      title: "The first player ever to unlock this milestone!",
      accentColor: "#FFD700",
      level: 2,
    },
  },
  {
    name: "silver-rare",
    data: {
      user: USER,
      milestone: {
        title: "Marathon Runner",
        description: "Complete 1000 ranked maps.",
        tier: "silver",
        iconGroup: "MAP",
        xp: 750,
      },
      title: "Unlocked a rare achievement!",
      subtitle: "Only 0.91% of players have it",
      accentColor: "#9B59B6",
      level: 50,
    },
  },
];

const setCards: { name: string; data: MilestoneSetCardData }[] = [
  {
    name: "standard",
    data: {
      user: USER,
      set: {
        title: "Accuracy Foundations",
        description: "Complete every Bronze tier milestone in the Accuracy Foundations collection.",
        bonusXp: 2500,
      },
      title: "Completed a whole milestone set!",
      accentColor: "#ec4899",
      level: 45,
    },
  },
  {
    name: "high-tier",
    data: {
      user: USER,
      set: {
        title: "Apex Collection",
        description: "Achieve every Apex tier milestone across all categories.",
        bonusXp: 25000,
      },
      title: "Completed a whole milestone set!",
      accentColor: "#ec4899",
      level: 102,
    },
  },
  {
    name: "no-description",
    data: {
      user: USER,
      set: {
        title: "Quickstart",
        bonusXp: 500,
      },
      title: "Completed a whole milestone set!",
      accentColor: "#ec4899",
      level: 8,
    },
  },
];

async function main() {
  mkdirSync("test-output", { recursive: true });

  for (const card of cards) {
    console.log(`Rendering ${card.name}...`);
    const result = await renderMilestoneCard(card.data);
    writeFileSync(`test-output/milestone-${card.name}.png`, result.image);
    console.log(`  -> test-output/milestone-${card.name}.png`);
  }

  for (const card of setCards) {
    console.log(`Rendering set-${card.name}...`);
    const result = await renderMilestoneSetCard(card.data);
    writeFileSync(`test-output/milestone-set-${card.name}.png`, result.image);
    console.log(`  -> test-output/milestone-set-${card.name}.png`);
  }

  console.log("\nDone! Check the test-output/ directory.");
}

main().catch(console.error);
