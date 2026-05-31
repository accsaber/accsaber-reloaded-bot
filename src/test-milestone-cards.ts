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
        id: "m-1",
        title: "Sub-13s",
        description: "Achieve an accuracy of 13% or higher on a Tech Acc map.",
        type: "milestone",
        tier: "gold",
        xp: 500,
        categoryId: "tech_acc",
      },
      trigger: "first",
      title: "Was the FIRST EVER to unlock the following milestone!",
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
        id: "m-2",
        title: "Quintuple Crown",
        description: "Hold a top-5 rank in every category simultaneously.",
        type: "achievement",
        tier: "platinum",
        xp: 1500,
      },
      trigger: "rare",
      title: "Just unlocked a rare achievement!",
      subtitle: "Only 0.42% of players have this",
      accentColor: "#9B59B6",
      level: 72,
    },
  },
  {
    name: "diamond-tier",
    data: {
      user: USER,
      milestone: {
        id: "m-3",
        title: "Diamond Accuracy",
        description: "Reach 99.5% average accuracy across all Standard Acc maps.",
        type: "milestone",
        tier: "diamond",
        xp: 2500,
        categoryId: "standard_acc",
      },
      trigger: "diamond_plus",
      title: "Just unlocked a diamond tier milestone!",
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
        id: "m-4",
        title: "Apex Predator",
        description: "Reach the #1 Overall ranking and hold it for a season.",
        type: "achievement",
        tier: "apex",
        xp: 10000,
      },
      trigger: "diamond_plus",
      title: "Just unlocked an apex tier achievement!",
      accentColor: "#5DADE2",
      level: 105,
    },
  },
  {
    name: "bronze-no-category",
    data: {
      user: USER,
      milestone: {
        id: "m-5",
        title: "First Steps",
        description: "Submit your first ranked score.",
        type: "milestone",
        tier: "bronze",
        xp: 50,
      },
      trigger: "first",
      title: "Was the FIRST EVER to unlock the following milestone!",
      accentColor: "#FFD700",
      level: 2,
    },
  },
  {
    name: "silver-rare",
    data: {
      user: USER,
      milestone: {
        id: "m-6",
        title: "Marathon Runner",
        description: "Complete 1000 ranked maps.",
        type: "achievement",
        tier: "silver",
        xp: 750,
      },
      trigger: "rare",
      title: "Just unlocked a rare achievement!",
      subtitle: "Only 0.91% of players have this",
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
        id: "set-1",
        title: "Accuracy Foundations",
        description: "Complete every Bronze tier milestone in the Accuracy Foundations collection.",
        bonusXp: 2500,
      },
      title: "Just completed a milestone set!",
      accentColor: "#ec4899",
      level: 45,
    },
  },
  {
    name: "high-tier",
    data: {
      user: USER,
      set: {
        id: "set-2",
        title: "Apex Collection",
        description: "Achieve every Apex tier milestone across all categories.",
        bonusXp: 25000,
      },
      title: "Just completed a milestone set!",
      accentColor: "#ec4899",
      level: 102,
    },
  },
  {
    name: "no-description",
    data: {
      user: USER,
      set: {
        id: "set-3",
        title: "Quickstart",
        bonusXp: 500,
      },
      title: "Just completed a milestone set!",
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
