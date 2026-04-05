import { EmbedBuilder } from "discord.js";
import type { ScoreResponse } from "../types/api.js";

export function parseHexColor(hex: string): number {
  return parseInt(hex.replace(/^#/, ""), 16);
}

export function formatDifficulty(diff: string): string {
  const map: Record<string, string> = {
    EASY: "Easy",
    NORMAL: "Normal",
    HARD: "Hard",
    EXPERT: "Expert",
    EXPERT_PLUS: "Expert+",
  };
  return map[diff] ?? diff;
}

export function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function mapUrl(score: ScoreResponse): string {
  return `https://accsaberreloaded.com/maps/${score.mapId}?difficultyId=${score.mapDifficultyId}`;
}

function profileUrl(score: ScoreResponse): string {
  return `https://accsaberreloaded.com/players/${score.userId}`;
}

function buildLinks(score: ScoreResponse): string {
  const parts = [
    `[Profile](${profileUrl(score)})`,
    `[Map](${mapUrl(score)})`,
  ];
  if (score.blScoreId) {
    parts.push(
      `[Replay](https://replay.beatleader.com/?scoreId=${score.blScoreId})`
    );
  }
  return parts.join(" · ");
}

function statsBlock(score: ScoreResponse, categoryName: string): string {
  const lines = [
    `**Map** ${score.songAuthor} - ${score.songName} [${formatDifficulty(score.difficulty)}]`,
    `**Category** ${categoryName}`,
    `**AP** \`${score.ap.toFixed(2)}\` · **Acc** \`${(score.accuracy * 100).toFixed(2)}%\` · **Rank** \`#${score.rank}\``,
  ];

  const comboParts: string[] = [];
  if (score.misses === 0 && score.badCuts === 0) {
    comboParts.push("**FC**");
  } else {
    if (score.misses > 0) comboParts.push(`${score.misses}x misses`);
    if (score.badCuts > 0) comboParts.push(`${score.badCuts}x bad cuts`);
  }
  if (score.streak115 > 0) {
    comboParts.push(`\`${score.streak115}x 115\``);
  }
  if (comboParts.length > 0) lines.push(comboParts.join(" · "));

  return lines.join("\n");
}

export interface FeedEmbedOptions {
  score: ScoreResponse;
  color: number;
  title: string;
  categoryName: string;
  linkTarget: "map" | "profile";
  extraInfo?: string;
}

export function buildFeedEmbed(opts: FeedEmbedOptions): EmbedBuilder {
  const { score, color, title, categoryName, linkTarget, extraInfo } = opts;

  const url = linkTarget === "map" ? mapUrl(score) : profileUrl(score);

  const lines = [
    statsBlock(score, categoryName),
  ];
  if (extraInfo) lines.push(extraInfo);
  lines.push(buildLinks(score));

  return new EmbedBuilder()
    .setColor(color)
    .setThumbnail(score.coverUrl)
    .setAuthor({
      name: `${score.userName} ${countryFlag(score.country)}`,
      iconURL: score.avatarUrl,
      url: profileUrl(score),
    })
    .setTitle(title)
    .setURL(url)
    .setDescription(lines.join("\n"))
    .setTimestamp(new Date(score.timeSet));
}
