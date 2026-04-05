import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
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

function comboLine(score: ScoreResponse): string {
  const parts: string[] = [];
  if (score.misses === 0 && score.badCuts === 0) {
    parts.push("**FC**");
  } else {
    if (score.misses > 0) parts.push(`${score.misses}x misses`);
    if (score.badCuts > 0) parts.push(`${score.badCuts}x bad cuts`);
  }
  if (score.streak115 > 0) parts.push(`${score.streak115}x 115`);
  return parts.join(" · ");
}

function songLine(score: ScoreResponse): string {
  return `${score.songAuthor} - **${score.songName}** [${formatDifficulty(score.difficulty)}] (${score.mapAuthor})`;
}

export interface FeedEmbedOptions {
  score: ScoreResponse;
  color: number;
  title: string;
  categoryName: string;
  linkTarget: "map" | "profile";
  preamble?: string;
  extraInfo?: string;
}

export interface FeedEmbedResult {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder>;
}

export function buildFeedEmbed(opts: FeedEmbedOptions): FeedEmbedResult {
  const { score, color, title, categoryName, linkTarget, preamble, extraInfo } = opts;

  const url = linkTarget === "map" ? mapUrl(score) : profileUrl(score);

  const descLines: string[] = [];
  if (preamble) descLines.push(preamble);
  descLines.push(songLine(score));
  if (extraInfo) descLines.push(extraInfo);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setThumbnail(score.coverUrl)
    .setAuthor({
      name: `${score.userName} ${countryFlag(score.country)}`,
      iconURL: score.avatarUrl,
      url: profileUrl(score),
    })
    .setTitle(title)
    .setURL(url)
    .setDescription(descLines.join("\n"))
    .addFields(
      { name: "AP", value: `\`${score.ap.toFixed(2)}\``, inline: true },
      { name: "Accuracy", value: `\`${(score.accuracy * 100).toFixed(2)}%\``, inline: true },
      { name: "Rank", value: `\`#${score.rank}\``, inline: true },
      { name: "Category", value: categoryName, inline: true },
      { name: "Combo", value: comboLine(score) || "-", inline: true },
    )
    .setTimestamp(new Date(score.timeSet));

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setEmoji("👤")
      .setLabel("Profile")
      .setStyle(ButtonStyle.Link)
      .setURL(profileUrl(score)),
    new ButtonBuilder()
      .setEmoji("🗺️")
      .setLabel("Map")
      .setStyle(ButtonStyle.Link)
      .setURL(mapUrl(score)),
  );

  if (score.blScoreId) {
    row.addComponents(
      new ButtonBuilder()
        .setEmoji("▶️")
        .setLabel("Replay")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://replay.beatleader.com/?scoreId=${score.blScoreId}`)
    );
  }

  return { embed, row };
}
