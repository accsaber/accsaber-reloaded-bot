import { EmbedBuilder } from "discord.js";

export const WEBSITE_URL = "https://accsaber.com";

export const Colors = {
  category: {
    trueAcc: 0x22c55e,
    standardAcc: 0x3b82f6,
    techAcc: 0xef4444,
    lowMid: 0xeab308,
    overall: 0xa855f7,
  },
  semantic: {
    success: 0x22c55e,
    warning: 0xeab308,
    error: 0xef4444,
    info: 0x3b82f6,
  },
  difficulty: {
    easy: 0x3cb371,
    normal: 0x4a90d9,
    hard: 0xf97316,
    expert: 0xef4444,
    expertPlus: 0x8b5cf6,
  },
  milestoneTier: {
    bronze: 0xcd7f32,
    silver: 0xc0c0c0,
    gold: 0xffd700,
    platinum: 0x4dd9e0,
    diamond: 0xb9f2ff,
  },
  levelTier: {
    newcomer: 0x6b7280,
    apprentice: 0x3b82f6,
    adept: 0x10b981,
    skilled: 0xcd7f32,
    expert: 0xc0c0d0,
    master: 0xfbbf24,
    grandmaster: 0x8b5cf6,
    legend: 0xf97316,
    transcendent: 0x22d3ee,
    mythic: 0xef4444,
    ascendant: 0xf472b6,
  },
} as const;

export function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.semantic.success)
    .setTitle(title)
    .setDescription(description);
}

export function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.semantic.error)
    .setTitle(title)
    .setDescription(description);
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.semantic.info)
    .setTitle(title)
    .setDescription(description);
}

export function linkPromptEmbed(intro: string): EmbedBuilder {
  return errorEmbed(
    "Account Not Linked",
    `${intro}\n\nLinking is only done on the website. Sign in at ${WEBSITE_URL} with your Discord account and you'll be linked automatically.`
  );
}

export function warningEmbed(
  title: string,
  description: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.semantic.warning)
    .setTitle(title)
    .setDescription(description);
}
