import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CampaignRequirementType, CampaignTargetMode } from "../types/api.js";
import {
  ASSETS_DIR,
  BG_BASE,
  BG_ELEVATED,
  BG_OVERLAY,
  MONO,
  SANS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  type Ctx,
  drawFlagIcon,
  drawRoundedRect,
  drawTrophyIcon,
  fetchImage,
  formatDifficulty,
  hexWithAlpha,
  numberFmt,
  registerFonts,
  roundRect,
} from "./canvas-utils.js";
import { getTierForLevel } from "./roles.js";

export type CampaignCardKind = "milestone" | "completion";

export interface CampaignCardItem {
  name: string;
  quantity: number;
}

export interface CampaignCardObjective {
  type: CampaignRequirementType;
  value?: number | null;
  valueMax?: number | null;
}

export interface CampaignCardNode {
  songName: string;
  songAuthor: string;
  mapAuthor: string;
  coverUrl?: string | null;
  difficulty: string;
  characteristic: string;
  modifiers: string[];
  objectives: CampaignCardObjective[];
  objectiveMode: CampaignTargetMode;
  complexity?: number | null;
  nps?: number | null;
}

export interface CampaignCardMilestone {
  label: string;
  avatarUrl?: string | null;
  xp: number;
  items: CampaignCardItem[];
  node?: CampaignCardNode;
  userValue?: number | null;
}

export interface CampaignCardData {
  kind: CampaignCardKind;
  user: {
    id: string;
    name: string;
    country?: string | null;
    avatarUrl?: string | null;
  };
  campaign: {
    name: string;
    slug: string;
    summary?: string | null;
    iconUrl?: string | null;
    backgroundUrl?: string | null;
    difficultyCount: number;
    completionXp: number;
    completionItems: CampaignCardItem[];
    official: boolean;
    legacy: boolean;
    curated: boolean;
    loved: boolean;
  };
  milestone?: CampaignCardMilestone;
  progress?: {
    completed: number;
    total: number;
    startedAt?: string | null;
    completedAt?: string | null;
  };
  title: string;
  subtitle?: string;
  accentColor: string;
  category?: { name: string; code: string };
  level?: number;
}

export interface CampaignCardResult {
  image: Buffer;
  profileUrl: string;
}

const W = 680;
const CARD_X = 18;
const CARD_Y = 14;
const CARD_W = W - CARD_X * 2;
const PAD = 22;
const HEADER_H = 70;
const ART_SIZE = 88;
const REWARDS_H = 48;
const PROGRESS_H = 26;
const FOOTER_H = 24;
const TEXT_X = PAD + 4 + ART_SIZE + 18;
const TEXT_MAX_W = CARD_W - TEXT_X - PAD;
const HERO_TOP = 70;
const HERO_PAD = 16;
const CHIP_H = 20;
const CHIP_GAP = 6;
const CHIP_ROW_H = 26;
const STAT_ROW_H = 26;
const STAT_BASELINE = 15;
const STAT_LABEL_SIZE = 10;
const STAT_JOIN_SIZE = 10;
const STAT_VALUE_SIZE = 14;
const STAT_LABEL_GAP = 7;
const STAT_JOIN_GAP = 12;
const STAT_SPLIT_GAP = 26;
const LOVED = "#f472b6";

export function normalizeMilestoneLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

interface RequirementUnit {
  label: string;
  digits: number;
  scale?: number;
  prefix?: string;
  suffix?: string;
  suffixOne?: string;
  valueless?: boolean;
}

const REQUIREMENT_UNITS: Record<CampaignRequirementType, RequirementUnit> = {
  ACC: { label: "ACC", digits: 2, scale: 100, suffix: "%" },
  AP: { label: "AP", digits: 2, suffix: " AP" },
  SCORE: { label: "SCORE", digits: 0 },
  STREAK_115: { label: "115 STREAK", digits: 0, suffix: " × 115" },
  COMBO: { label: "COMBO", digits: 0, suffix: " COMBO" },
  BOMB_HITS: { label: "BOMBS", digits: 0, suffix: " BOMBS", suffixOne: " BOMB" },
  RANK: { label: "RANK", digits: 0, prefix: "#" },
  FC: { label: "FULL COMBO", digits: 0, valueless: true },
  PASS: { label: "PASS", digits: 0, valueless: true },
};

function unitSuffix(unit: RequirementUnit, value: number): string {
  if (unit.suffixOne && Math.abs(value) === 1) return unit.suffixOne;
  return unit.suffix ?? "";
}

export function formatMeasure(
  type: CampaignRequirementType,
  value?: number | null
): string {
  const unit = REQUIREMENT_UNITS[type];
  if (!unit) return type;
  if (unit.valueless || value == null) return unit.label;
  return `${unit.prefix ?? ""}${numberFmt(value * (unit.scale ?? 1), unit.digits)}${unitSuffix(unit, value)}`;
}

export function formatRequirement(
  type: CampaignRequirementType,
  value?: number | null,
  valueMax?: number | null
): string {
  const unit = REQUIREMENT_UNITS[type];
  if (!unit) return type;
  if (unit.valueless || (value == null && valueMax == null)) return unit.label;

  const bound = (v: number) =>
    `${unit.prefix ?? ""}${numberFmt(v * (unit.scale ?? 1), unit.digits)}`;
  const tail = unitSuffix(unit, valueMax ?? value!);

  if (value != null && valueMax != null) {
    return `${bound(value)}–${bound(valueMax)}${tail}`;
  }
  if (type === "RANK") return `${bound(value ?? valueMax!)}${tail}`;
  if (type === "BOMB_HITS" && valueMax === 0) return "NO BOMBS";
  if (value != null) return `≥ ${bound(value)}${tail}`;
  return `≤ ${bound(valueMax!)}${tail}`;
}

export function formatObjectives(
  objectives: CampaignCardObjective[],
  mode: CampaignTargetMode
): string {
  return objectives
    .map((o) => formatRequirement(o.type, o.value, o.valueMax))
    .join(mode === "OR" ? " or " : " and ");
}

export function formatElapsed(from?: string | null, to?: string | null): string | null {
  if (!from || !to) return null;
  const ms = Date.parse(to) - Date.parse(from);
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return plural(Math.max(1, mins), "minute");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return plural(hrs, "hour");
  const days = Math.floor(hrs / 24);
  if (days < 30) return plural(days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return plural(months, "month");
  return plural(Math.floor(days / 365), "year");
}

export async function renderCampaignCard(
  data: CampaignCardData
): Promise<CampaignCardResult> {
  registerFonts();

  const { user, campaign, milestone } = data;
  const accent = data.accentColor;
  const isMilestone = data.kind === "milestone";

  const tierInfo = data.level ? getTierForLevel(data.level) : undefined;
  const levelTierHex = tierInfo
    ? `#${tierInfo.color.toString(16).padStart(6, "0")}`
    : TEXT_SECONDARY;

  const xpValue = isMilestone ? (milestone?.xp ?? 0) : campaign.completionXp;
  const rewards = isMilestone ? (milestone?.items ?? []) : campaign.completionItems;
  const hasRewards = xpValue > 0 || rewards.length > 0;

  const total = data.progress?.total ?? 0;
  const completed = data.progress?.completed ?? 0;
  const hasProgress = total > 0;

  const measureCtx = createCanvas(1, 1).getContext("2d");
  const chipRows = layoutChips(measureCtx, tagSpecs(data), TEXT_MAX_W);
  const statRows = layoutStats(measureCtx, statGroups(data), TEXT_MAX_W);
  const heroH =
    HERO_TOP +
    chipRows.length * CHIP_ROW_H +
    statRows.length * STAT_ROW_H +
    HERO_PAD;

  const CARD_H =
    PAD -
    2 +
    HEADER_H +
    heroH +
    (hasRewards ? REWARDS_H : 0) +
    (hasProgress ? PROGRESS_H : 0) +
    FOOTER_H;
  const H = CARD_Y * 2 + CARD_H;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG_BASE;
  ctx.fillRect(0, 0, W, H);

  const [avatarImg, hero] = await Promise.all([
    loadOptionalImage(user.avatarUrl),
    loadHeroImage(data),
  ]);

  const backdropImg = await loadOptionalImage(
    isMilestone && !hero.rounded
      ? milestone?.node?.coverUrl
      : campaign.backgroundUrl
  );

  drawRoundedRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 12, "#13131c", BG_OVERLAY);

  ctx.save();
  roundRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 12);
  ctx.clip();

  if (backdropImg) {
    const bandW = 300;
    const bandX = CARD_X + CARD_W - bandW;
    const scale = Math.max(bandW / backdropImg.width, CARD_H / backdropImg.height);
    const drawW = backdropImg.width * scale;
    const drawH = backdropImg.height * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(bandX, CARD_Y, bandW, CARD_H);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.drawImage(
      backdropImg,
      bandX + (bandW - drawW) / 2,
      CARD_Y + (CARD_H - drawH) / 2,
      drawW,
      drawH
    );
    ctx.restore();

    const fade = ctx.createLinearGradient(bandX, 0, bandX + bandW, 0);
    fade.addColorStop(0, "#13131c");
    fade.addColorStop(0.6, hexWithAlpha("#13131c", 0.5));
    fade.addColorStop(1, hexWithAlpha("#13131c", 0.3));
    ctx.fillStyle = fade;
    ctx.fillRect(bandX, CARD_Y, bandW, CARD_H);
  }

  const wash = ctx.createRadialGradient(
    CARD_X + CARD_W - 60,
    CARD_Y + 20,
    0,
    CARD_X + CARD_W - 60,
    CARD_Y + 20,
    420
  );
  wash.addColorStop(0, hexWithAlpha(accent, isMilestone ? 0.2 : 0.16));
  wash.addColorStop(1, hexWithAlpha(accent, 0));
  ctx.fillStyle = wash;
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H);
  ctx.restore();

  const leftX = CARD_X + PAD + 4;
  const rightEdge = CARD_X + CARD_W - PAD;
  let curY = CARD_Y + PAD - 2;

  ctx.textBaseline = "top";

  let topRightX = rightEdge;
  const statusLabel = campaign.official
    ? "OFFICIAL"
    : campaign.curated
      ? "CURATED"
      : null;
  if (statusLabel) {
    topRightX = drawRightChip(ctx, topRightX, curY + 4, statusLabel, accent) - 6;
  }
  if (campaign.loved) {
    topRightX = drawRightChip(ctx, topRightX, curY + 4, "LOVED", LOVED) - 6;
  }
  if (data.category) {
    topRightX =
      drawRightChip(
        ctx,
        topRightX,
        curY + 4,
        data.category.name.toUpperCase(),
        TEXT_SECONDARY
      ) - 6;
  }

  const avSize = 50;
  const avPad = 2;
  const borderSize = avSize + avPad * 2;

  drawRoundedRect(
    ctx,
    leftX - avPad,
    curY - avPad,
    borderSize,
    borderSize,
    10,
    BG_ELEVATED
  );

  if (avatarImg) {
    ctx.save();
    roundRect(ctx, leftX - avPad, curY - avPad, borderSize, borderSize, 10);
    ctx.clip();
    ctx.drawImage(avatarImg, leftX - avPad, curY - avPad, borderSize, borderSize);
    ctx.restore();
  }

  roundRect(ctx, leftX - avPad, curY - avPad, borderSize, borderSize, 10);
  ctx.strokeStyle = levelTierHex;
  ctx.lineWidth = avPad;
  ctx.stroke();

  const nameX = leftX + avSize + 12;
  ctx.font = `700 17px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  let displayName = user.name;
  if (displayName.length > 24) displayName = displayName.slice(0, 22) + "...";
  ctx.fillText(displayName, nameX, curY + 2);

  const nameW = ctx.measureText(displayName).width;
  const country = user.country?.toUpperCase();
  if (country && country.length === 2) {
    ctx.font = `700 9px ${MONO}`;
    const tagW = ctx.measureText(country).width + 10;
    drawRoundedRect(ctx, nameX + nameW + 8, curY + 4, tagW, 15, 3, BG_OVERLAY);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.textBaseline = "middle";
    ctx.fillText(country, nameX + nameW + 13, curY + 11);
    ctx.textBaseline = "top";
  }

  const headerMaxW = topRightX - nameX - 12;
  ctx.font = `600 13px ${SANS}`;
  ctx.fillStyle = accent;
  ctx.fillText(truncate(ctx, data.title, headerMaxW), nameX, curY + 26);

  if (data.subtitle) {
    ctx.font = `400 11px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(truncate(ctx, data.subtitle, headerMaxW), nameX, curY + 45);
  }

  curY += HEADER_H;

  drawHero(ctx, leftX, curY, ART_SIZE, ART_SIZE + 8, accent, hero, isMilestone);

  const textX = CARD_X + TEXT_X;
  const textMaxW = TEXT_MAX_W;

  ctx.font = `700 10px ${MONO}`;
  ctx.fillStyle = accent;
  ctx.fillText(isMilestone ? "MILESTONE REACHED" : "CAMPAIGN CLEARED", textX, curY);

  ctx.font = `700 24px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  const headline = isMilestone ? (milestone?.label ?? campaign.name) : campaign.name;
  ctx.fillText(truncate(ctx, headline, textMaxW), textX, curY + 14);

  const node = milestone?.node;
  if (isMilestone && node) {
    ctx.font = `600 13px ${SANS}`;
    ctx.fillStyle = TEXT_PRIMARY;
    const song = truncate(ctx, node.songName, textMaxW * 0.6);
    ctx.fillText(song, textX, curY + 48);
    const authorX = textX + ctx.measureText(song).width + 7;

    ctx.font = `400 12px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(
      truncate(ctx, `by ${node.songAuthor}`, rightEdge - authorX),
      authorX,
      curY + 49
    );
  } else if (!isMilestone && campaign.summary) {
    ctx.font = `400 12px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    const lines = wrapText(ctx, campaign.summary, textMaxW, 2);
    let y = curY + 46;
    for (const line of lines) {
      ctx.fillText(line, textX, y);
      y += 16;
    }
  }

  drawChipRows(ctx, textX, curY + HERO_TOP, chipRows);
  drawStatRows(
    ctx,
    textX,
    curY + HERO_TOP + chipRows.length * CHIP_ROW_H,
    statRows
  );

  curY += heroH;

  if (hasRewards) {
    ctx.font = `700 10px ${MONO}`;
    ctx.fillStyle = TEXT_TERTIARY;
    ctx.fillText("REWARDS", leftX, curY);

    let rewardX = leftX;
    if (xpValue > 0) {
      const xpStr = `+${numberFmt(xpValue, 0)}`;
      ctx.font = `700 20px ${MONO}`;
      ctx.fillStyle = accent;
      ctx.fillText(xpStr, rewardX, curY + 16);
      const xpW = ctx.measureText(xpStr).width;

      ctx.font = `700 11px ${MONO}`;
      ctx.fillStyle = hexWithAlpha(accent, 0.75);
      ctx.fillText("XP", rewardX + xpW + 5, curY + 25);
      rewardX += xpW + ctx.measureText("XP").width + 21;
    }

    for (const reward of rewards) {
      const label =
        reward.quantity > 1 ? `${reward.name} ×${reward.quantity}` : reward.name;
      ctx.font = `600 12px ${SANS}`;
      const pillW = ctx.measureText(label).width + 30;
      if (rewardX + pillW > rightEdge) break;

      drawRoundedRect(
        ctx,
        rewardX,
        curY + 16,
        pillW,
        24,
        6,
        hexWithAlpha(accent, 0.14),
        hexWithAlpha(accent, 0.35)
      );
      drawGiftDot(ctx, rewardX + 11, curY + 28, accent);
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.textBaseline = "middle";
      ctx.font = `600 12px ${SANS}`;
      ctx.fillText(label, rewardX + 20, curY + 29);
      ctx.textBaseline = "top";
      rewardX += pillW + 8;
    }

    curY += REWARDS_H;
  }

  if (hasProgress) {
    const pct = Math.max(0, Math.min(1, completed / total));
    const label = `${numberFmt(completed, 0)} of ${numberFmt(total, 0)} maps`;
    ctx.font = `600 11px ${SANS}`;
    const labelW = ctx.measureText(label).width;
    ctx.fillStyle = pct >= 1 ? accent : TEXT_SECONDARY;
    ctx.fillText(label, rightEdge - labelW, curY + 1);

    const barW = rightEdge - leftX - labelW - 16;
    const barY = curY + 5;
    drawRoundedRect(ctx, leftX, barY, barW, 6, 3, BG_ELEVATED);
    if (pct > 0) {
      ctx.save();
      ctx.shadowColor = hexWithAlpha(accent, 0.5);
      ctx.shadowBlur = 8;
      drawRoundedRect(ctx, leftX, barY, Math.max(6, barW * pct), 6, 3, accent);
      ctx.restore();
    }

    curY += PROGRESS_H;
  }

  try {
    const logoBuf = await readFile(join(ASSETS_DIR, "logo.png"));
    const logoImg = await loadImage(logoBuf);
    const logoSize = 14;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(
      logoImg,
      rightEdge - logoSize,
      CARD_Y + CARD_H - 22,
      logoSize,
      logoSize
    );
    ctx.restore();
  } catch {
    /* logo not available */
  }

  return {
    image: canvas.toBuffer("image/png"),
    profileUrl: `https://accsaber.com/players/${user.id}`,
  };
}

interface HeroArt {
  img: Awaited<ReturnType<typeof loadImage>> | null;
  rounded: boolean;
}

function drawHero(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: string,
  hero: HeroArt,
  isMilestone: boolean
): void {
  const img = hero.img;
  if (img) {
    const scale = Math.min(w / img.width, h / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = x + (w - drawW) / 2;
    const drawY = y + (h - drawH) / 2;

    if (hero.rounded) {
      ctx.save();
      ctx.shadowColor = hexWithAlpha(accent, 0.5);
      ctx.shadowBlur = 16;
      drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 10, hexWithAlpha(accent, 0.12));
      ctx.restore();

      ctx.save();
      roundRect(ctx, drawX, drawY, drawW, drawH, 10);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      roundRect(ctx, drawX, drawY, drawW, drawH, 10);
      ctx.strokeStyle = hexWithAlpha(accent, 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    }

    ctx.save();
    ctx.shadowColor = hexWithAlpha(accent, 0.65);
    ctx.shadowBlur = isMilestone ? 26 : 18;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
    return;
  }

  const glyph = Math.min(w, h) * 0.72;
  const drawIcon = isMilestone ? drawFlagIcon : drawTrophyIcon;
  drawIcon(ctx, x + (w - glyph) / 2, y + (h - glyph) / 2, glyph, accent, {
    color: accent,
    blur: 20,
  });
}

async function loadHeroImage(data: CampaignCardData): Promise<HeroArt> {
  if (data.kind === "milestone") {
    const checkpoint = await loadOptionalImage(data.milestone?.avatarUrl);
    if (checkpoint) return { img: checkpoint, rounded: false };
    const cover = await loadOptionalImage(data.milestone?.node?.coverUrl);
    if (cover) return { img: cover, rounded: true };
  }
  return { img: await loadOptionalImage(data.campaign.iconUrl), rounded: false };
}

function drawGiftDot(ctx: Ctx, cx: number, cy: number, color: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();
}

interface ChipSpec {
  label: string;
  color: string;
}

function tagSpecs(data: CampaignCardData): ChipSpec[] {
  const accent = data.accentColor;

  if (data.kind === "milestone") {
    const node = data.milestone?.node;
    if (!node) return [];
    return [
      { label: formatDifficulty(node.difficulty).toUpperCase(), color: accent },
      ...node.modifiers.map((code) => ({ label: code, color: accent })),
    ];
  }

  const specs: ChipSpec[] = [
    { label: `${data.campaign.difficultyCount} MAPS`, color: accent },
  ];
  const elapsed = formatElapsed(data.progress?.startedAt, data.progress?.completedAt);
  if (elapsed) specs.push({ label: elapsed.toUpperCase(), color: TEXT_SECONDARY });
  if (data.campaign.legacy) specs.push({ label: "LEGACY", color: TEXT_SECONDARY });
  return specs;
}

function chipWidth(ctx: Ctx, spec: ChipSpec): number {
  ctx.font = `700 10px ${MONO}`;
  return ctx.measureText(spec.label).width + 18;
}

function layoutChips(ctx: Ctx, specs: ChipSpec[], maxW: number): ChipSpec[][] {
  const rows: ChipSpec[][] = [];
  let row: ChipSpec[] = [];
  let width = 0;

  for (const spec of specs) {
    const own = chipWidth(ctx, spec);
    if (row.length > 0 && width + CHIP_GAP + own > maxW) {
      rows.push(row);
      row = [spec];
      width = own;
      continue;
    }
    row.push(spec);
    width += (row.length > 1 ? CHIP_GAP : 0) + own;
  }

  if (row.length > 0) rows.push(row);
  return rows;
}

function drawChipRows(ctx: Ctx, x: number, y: number, rows: ChipSpec[][]): void {
  let rowY = y;
  for (const row of rows) {
    let chipX = x;
    for (const spec of row) {
      chipX += drawChip(ctx, chipX, rowY, spec.label, spec.color) + CHIP_GAP;
    }
    rowY += CHIP_ROW_H;
  }
}

interface StatSegment {
  text: string;
  size: number;
  color: string;
  gapBefore: number;
}

type StatGroup = StatSegment[];

function statGroups(data: CampaignCardData): StatGroup[] {
  const node = data.kind === "milestone" ? data.milestone?.node : undefined;
  if (!node || node.objectives.length === 0) return [];

  const value = (text: string, color: string): StatSegment => ({
    text,
    size: STAT_VALUE_SIZE,
    color,
    gapBefore: STAT_LABEL_GAP,
  });

  const groups: StatGroup[] = node.objectives.map((objective, i) => {
    const target = formatRequirement(
      objective.type,
      objective.value,
      objective.valueMax
    );
    const lead: StatSegment =
      i === 0
        ? { text: "NEEDED", size: STAT_LABEL_SIZE, color: TEXT_TERTIARY, gapBefore: 0 }
        : {
            text: node.objectiveMode.toLowerCase(),
            size: STAT_JOIN_SIZE,
            color: TEXT_TERTIARY,
            gapBefore: STAT_JOIN_GAP,
          };
    return [lead, value(target, TEXT_SECONDARY)];
  });

  if (data.milestone?.userValue != null) {
    groups.push([
      {
        text: "GOT",
        size: STAT_LABEL_SIZE,
        color: TEXT_TERTIARY,
        gapBefore: STAT_SPLIT_GAP,
      },
      value(
        formatMeasure(node.objectives[0].type, data.milestone.userValue),
        data.accentColor
      ),
    ]);
  }

  return groups;
}

function statGroupWidth(ctx: Ctx, group: StatGroup, atRowStart: boolean): number {
  return group.reduce((w, seg, i) => {
    ctx.font = `700 ${seg.size}px ${MONO}`;
    const gap = atRowStart && i === 0 ? 0 : seg.gapBefore;
    return w + gap + ctx.measureText(seg.text).width;
  }, 0);
}

function layoutStats(ctx: Ctx, groups: StatGroup[], maxW: number): StatGroup[][] {
  const rows: StatGroup[][] = [];
  let row: StatGroup[] = [];
  let width = 0;

  for (const group of groups) {
    const own = statGroupWidth(ctx, group, row.length === 0);
    if (row.length > 0 && width + own > maxW) {
      rows.push(row);
      row = [group];
      width = statGroupWidth(ctx, group, true);
      continue;
    }
    row.push(group);
    width += own;
  }

  if (row.length > 0) rows.push(row);
  return rows;
}

function drawStatRows(ctx: Ctx, x: number, y: number, rows: StatGroup[][]): void {
  let rowY = y;
  ctx.textBaseline = "alphabetic";

  for (const row of rows) {
    let statX = x;
    row.forEach((group, gi) => {
      group.forEach((seg, si) => {
        if (gi > 0 || si > 0) statX += seg.gapBefore;
        ctx.font = `700 ${seg.size}px ${MONO}`;
        ctx.fillStyle = seg.color;
        ctx.fillText(seg.text, statX, rowY + STAT_BASELINE);
        statX += ctx.measureText(seg.text).width;
      });
    });
    rowY += STAT_ROW_H;
  }

  ctx.textBaseline = "top";
}

function drawChip(
  ctx: Ctx,
  x: number,
  y: number,
  label: string,
  color: string
): number {
  ctx.font = `700 10px ${MONO}`;
  const w = ctx.measureText(label).width + 18;
  drawRoundedRect(
    ctx,
    x,
    y,
    w,
    CHIP_H,
    5,
    hexWithAlpha(color, 0.16),
    hexWithAlpha(color, 0.4)
  );
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 9, y + CHIP_H / 2 + 1);
  ctx.textBaseline = "top";
  return w;
}

function drawRightChip(
  ctx: Ctx,
  rightX: number,
  y: number,
  label: string,
  color: string
): number {
  ctx.font = `700 10px ${MONO}`;
  let text = label;
  while (ctx.measureText(text).width > 180 && text.length > 6) {
    text = text.slice(0, -4) + "...";
  }
  const w = ctx.measureText(text).width + 16;
  const x = rightX - w;
  drawRoundedRect(ctx, x, y, w, 18, 4, hexWithAlpha(color, 0.16));
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 8, y + 9);
  ctx.textBaseline = "top";
  return x;
}

async function loadOptionalImage(
  url: string | null | undefined
): Promise<Awaited<ReturnType<typeof loadImage>> | null> {
  if (!url) return null;
  try {
    return await fetchImage(url);
  } catch {
    return null;
  }
}

function truncate(ctx: Ctx, text: string, maxWidth: number): string {
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 6) {
    out = out.slice(0, -4) + "...";
  }
  return out;
}

function wrapText(
  ctx: Ctx,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines) {
    const consumed = lines.flatMap((l) => l.split(/\s+/)).length;
    let last = lines[maxLines - 1];
    if (words.length > consumed) {
      while (ctx.measureText(last + "...").width > maxWidth && last.length > 4) {
        last = last.slice(0, -2);
      }
      last = last + "...";
    }
    lines[maxLines - 1] = last;
  }

  return lines;
}
