import { EmbedBuilder } from "discord.js";
import type { ScoreResponse } from "../types/api.js";

export function parseHexColor(hex: string): number {
  return parseInt(hex.replace(/^#/, ""), 16);
}

function formatDifficulty(diff: string): string {
  const map: Record<string, string> = {
    EASY: "Easy",
    NORMAL: "Normal",
    HARD: "Hard",
    EXPERT: "Expert",
    EXPERT_PLUS: "Expert+",
  };
  return map[diff] ?? diff;
}

function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function mapUrl(score: ScoreResponse): string {
  return `https://accsaberreloaded.com/maps/${score.mapId}`;
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
  return parts.join(" | ");
}

function songLine(score: ScoreResponse): string {
  return `${score.songAuthor} - **${score.songName}** [${formatDifficulty(score.difficulty)}] (${score.mapAuthor})`;
}

function statsLine(score: ScoreResponse, categoryName: string): string {
  const parts = [
    `**${categoryName}**`,
    `\`#${score.rank}\``,
    `\`${score.ap.toFixed(2)} AP\``,
    `\`${(score.accuracy * 100).toFixed(2)}%\``,
  ];
  if (score.streak115 > 0) {
    parts.push(`\`${score.streak115}x 115\``);
  }
  if (score.misses === 0 && score.badCuts === 0) {
    parts.push("**FC**");
  } else {
    const miss: string[] = [];
    if (score.misses > 0) miss.push(`${score.misses}x misses`);
    if (score.badCuts > 0) miss.push(`${score.badCuts}x bad cuts`);
    parts.push(miss.join(", "));
  }
  return parts.join(" | ");
}

export type EmbedThumbnail = "cover" | "avatar";

export interface FeedEmbedOptions {
  score: ScoreResponse;
  color: number;
  title: string;
  categoryName: string;
  linkTarget: "map" | "profile";
  thumbnail?: EmbedThumbnail;
  extraInfo?: string;
}

export function buildFeedEmbed(opts: FeedEmbedOptions): EmbedBuilder {
  const { score, color, title, categoryName, linkTarget, thumbnail, extraInfo } = opts;

  const url = linkTarget === "map" ? mapUrl(score) : profileUrl(score);
  const thumb = (thumbnail ?? "cover") === "cover" ? score.coverUrl : score.avatarUrl;

  const lines = [
    songLine(score),
    statsLine(score, categoryName),
    buildLinks(score),
  ];
  if (extraInfo) lines.splice(2, 0, extraInfo);

  return new EmbedBuilder()
    .setColor(color)
    .setThumbnail(thumb)
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
