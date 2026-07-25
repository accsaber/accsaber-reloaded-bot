import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ItemRarity } from "../types/api.js";
import {
  ASSETS_DIR,
  BG_BASE,
  BG_ELEVATED,
  BG_OVERLAY,
  MONO,
  SANS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  type Ctx,
  drawCrateIcon,
  drawRoundedRect,
  drawSparkleIcon,
  fetchImage,
  hexWithAlpha,
  numberFmt,
  registerFonts,
  roundRect,
} from "./canvas-utils.js";
import { drawItemTypeIcon } from "./item-type-icons.js";
import { getTierForLevel } from "./roles.js";

export interface CrateCardModifier {
  key: string;
  name: string;
  colorHex?: string | null;
}

export interface CrateCardData {
  user: {
    id: string;
    name: string;
    country?: string | null;
    avatarUrl?: string | null;
  };
  crate: {
    name: string;
    rarity: ItemRarity;
    iconUrl?: string | null;
  };
  reward: {
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    typeKey: string;
    rarity: ItemRarity;
    worth?: number | null;
    serialNumber?: number | null;
    quantity: number;
    modifiers: CrateCardModifier[];
    unusualEffect?: { key: string; name: string } | null;
  };
  title: string;
  subtitle?: string;
  level?: number;
}

export interface CrateCardResult {
  image: Buffer;
  profileUrl: string;
}

const W = 680;
const CARD_X = 18;
const CARD_Y = 14;
const CARD_W = W - CARD_X * 2;
const PAD = 22;
const HEADER_H = 68;
const ICON_SIZE = 84;
const CHIPS_ROW_H = 28;
const FOOTER_H = 56;

export const RARITY_HEX: Record<ItemRarity, string> = {
  common: "#5e5973",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#ffd700",
  mythic: "#ef4444",
};

const RARITY_LABEL: Record<ItemRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

const STRONG_GLOW_RARITIES: Set<ItemRarity> = new Set(["legendary", "mythic"]);

const TYPE_LABEL: Record<string, string> = {
  crate: "Crate",
  badge: "Badge",
  title: "Title",
  theme: "Theme",
  saber: "Saber",
  item_pedestal: "Pedestal",
  statistic: "Statistic",
  perk: "Perk",
  profile_border_shape: "Border Shape",
  profile_border_color: "Border Color",
  profile_background: "Background",
  profile_thumbnail_background: "Thumbnail",
};

const HIDDEN_MODIFIERS = new Set(["normal"]);

export function rarityHex(rarity: ItemRarity): string {
  return RARITY_HEX[rarity] ?? RARITY_HEX.common;
}

export function rarityLabel(rarity: ItemRarity): string {
  return RARITY_LABEL[rarity] ?? rarity;
}

export function itemTypeLabel(typeKey: string): string {
  const known = TYPE_LABEL[typeKey];
  if (known) return known;
  return typeKey
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function renderCrateCard(
  data: CrateCardData
): Promise<CrateCardResult> {
  registerFonts();

  const { user, crate, reward } = data;
  const accent = rarityHex(reward.rarity);
  const strongGlow = STRONG_GLOW_RARITIES.has(reward.rarity);
  const effect = reward.unusualEffect ?? null;
  const modifiers = reward.modifiers.filter((m) => !HIDDEN_MODIFIERS.has(m.key));

  const tierInfo = data.level ? getTierForLevel(data.level) : undefined;
  const levelTierHex = tierInfo
    ? `#${tierInfo.color.toString(16).padStart(6, "0")}`
    : TEXT_SECONDARY;

  const hasChips = modifiers.length > 0 || effect !== null;
  const worth = reward.worth ?? 0;

  const CARD_H =
    PAD - 2 + HEADER_H + ICON_SIZE + 14 + (hasChips ? CHIPS_ROW_H : 0) + FOOTER_H;
  const H = CARD_Y * 2 + CARD_H;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG_BASE;
  ctx.fillRect(0, 0, W, H);

  const [avatarImg, itemImg] = await Promise.all([
    loadOptionalImage(user.avatarUrl),
    loadOptionalImage(reward.iconUrl),
  ]);

  drawRoundedRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 12, "#13131c", BG_OVERLAY);

  ctx.save();
  roundRect(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 12);
  ctx.clip();
  const wash = ctx.createRadialGradient(
    CARD_X + CARD_W - 60,
    CARD_Y + 20,
    0,
    CARD_X + CARD_W - 60,
    CARD_Y + 20,
    420
  );
  wash.addColorStop(0, hexWithAlpha(accent, strongGlow ? 0.2 : 0.16));
  wash.addColorStop(1, hexWithAlpha(accent, 0));
  ctx.fillStyle = wash;
  ctx.fillRect(CARD_X, CARD_Y, CARD_W, CARD_H);
  ctx.restore();

  const leftX = CARD_X + PAD + 4;
  const rightEdge = CARD_X + CARD_W - PAD;
  let curY = CARD_Y + PAD - 2;

  ctx.textBaseline = "top";

  const rarityChip = rarityLabel(reward.rarity).toUpperCase();
  ctx.font = `700 10px ${MONO}`;
  const rarityChipW = ctx.measureText(rarityChip).width + 16;
  const rarityChipX = rightEdge - rarityChipW;
  drawRoundedRect(
    ctx,
    rarityChipX,
    curY + 4,
    rarityChipW,
    18,
    4,
    hexWithAlpha(accent, 0.16)
  );
  ctx.fillStyle = accent;
  ctx.textBaseline = "middle";
  ctx.fillText(rarityChip, rarityChipX + 8, curY + 13);
  ctx.textBaseline = "top";
  const topRightX = rarityChipX;

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
  ctx.fillText(displayName, nameX, curY + 1);

  const nameW = ctx.measureText(displayName).width;
  const country = user.country?.toUpperCase();
  if (country && country.length === 2) {
    ctx.font = `700 9px ${MONO}`;
    const tagW = ctx.measureText(country).width + 10;
    drawRoundedRect(ctx, nameX + nameW + 8, curY + 3, tagW, 15, 3, BG_OVERLAY);
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.textBaseline = "middle";
    ctx.fillText(country, nameX + nameW + 13, curY + 10);
    ctx.textBaseline = "top";
  }

  ctx.font = `600 12px ${SANS}`;
  ctx.fillStyle = accent;
  ctx.fillText(truncate(ctx, data.title, topRightX - nameX - 12), nameX, curY + 24);

  if (data.subtitle) {
    ctx.font = `500 11px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.fillText(
      truncate(ctx, data.subtitle, topRightX - nameX - 12),
      nameX,
      curY + 40
    );
  }

  curY += avSize + 18;

  const iconSize = ICON_SIZE;
  const iconX = leftX;
  const iconY = curY;
  const glowColor = effect ? "#ffd27d" : accent;

  drawItemIcon(ctx, iconX, iconY, iconSize, accent, reward.typeKey, itemImg, {
    color: glowColor,
    blur: effect ? 26 : strongGlow ? 20 : 12,
  });

  const textX = iconX + iconSize + 16;
  const textMaxW = rightEdge - textX;

  ctx.font = `700 10px ${MONO}`;
  ctx.fillStyle = accent;
  const kicker = itemTypeLabel(reward.typeKey).toUpperCase();
  ctx.fillText(kicker, textX, iconY + 1);

  ctx.font = `700 19px ${SANS}`;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.fillText(truncate(ctx, reward.name, textMaxW), textX, iconY + 15);

  if (reward.description) {
    ctx.font = `400 12px ${SANS}`;
    ctx.fillStyle = TEXT_SECONDARY;
    const lines = wrapText(ctx, reward.description, textMaxW, 2);
    let y = iconY + 40;
    for (const line of lines) {
      ctx.fillText(line, textX, y);
      y += 16;
    }
  }

  curY += iconSize + 14;

  if (hasChips) {
    let chipX = leftX;
    if (effect) {
      chipX = drawChip(ctx, chipX, curY, effect.name.toUpperCase(), "#ffd27d", true);
    }
    for (const mod of modifiers) {
      const color = normalizeHex(mod.colorHex) ?? TEXT_SECONDARY;
      if (chipX + measureChip(ctx, mod.name.toUpperCase()) > rightEdge) break;
      chipX = drawChip(ctx, chipX, curY, mod.name.toUpperCase(), color, false);
    }
    curY += CHIPS_ROW_H;
  }

  if (worth > 0) {
    const worthStr = numberFmt(worth, 0);
    ctx.font = `700 26px ${MONO}`;
    const worthW = ctx.measureText(worthStr).width;
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.fillText(worthStr, leftX, curY);

    ctx.font = `700 11px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText("ESSENCE", leftX + worthW + 6, curY + 13);
  } else {
    const crateColor = rarityHex(crate.rarity);
    drawCrateIcon(ctx, leftX, curY + 4, 16, crateColor, {
      color: crateColor,
      blur: 8,
    });
    ctx.font = `700 10px ${MONO}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.textBaseline = "middle";
    ctx.fillText(`FROM ${crate.name.toUpperCase()}`, leftX + 22, curY + 12);
    ctx.textBaseline = "top";
  }

  let footRightX = rightEdge;
  if (worth > 0) {
    footRightX = drawRightChip(
      ctx,
      footRightX,
      curY + 4,
      crate.name.toUpperCase(),
      rarityHex(crate.rarity)
    );
    footRightX -= 6;
  }
  if (reward.serialNumber != null) {
    footRightX =
      drawRightChip(
        ctx,
        footRightX,
        curY + 4,
        `#${numberFmt(reward.serialNumber, 0)}`,
        accent
      ) - 6;
  }
  if (reward.quantity > 1) {
    drawRightChip(ctx, footRightX, curY + 4, `×${reward.quantity}`, TEXT_SECONDARY);
  }

  const footY = CARD_Y + CARD_H - 22;
  try {
    const logoBuf = await readFile(join(ASSETS_DIR, "logo.png"));
    const logoImg = await loadImage(logoBuf);
    const logoSize = 14;
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(logoImg, rightEdge - logoSize, footY, logoSize, logoSize);
    ctx.restore();
  } catch {
    /* logo not available */
  }

  return {
    image: canvas.toBuffer("image/png"),
    profileUrl: `https://accsaber.com/players/${user.id}`,
  };
}

function drawItemIcon(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  accent: string,
  typeKey: string,
  img: Awaited<ReturnType<typeof loadImage>> | null,
  glow: { color: string; blur: number }
): void {
  ctx.save();
  ctx.shadowColor = hexWithAlpha(glow.color, 0.7);
  ctx.shadowBlur = glow.blur;
  drawRoundedRect(ctx, x, y, size, size, 12, hexWithAlpha(accent, 0.12));
  ctx.restore();

  if (img) {
    const inner = size * 0.8;
    const scale = Math.min(inner / img.width, inner / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.save();
    roundRect(ctx, x, y, size, size, 12);
    ctx.clip();
    ctx.drawImage(
      img,
      x + (size - drawW) / 2,
      y + (size - drawH) / 2,
      drawW,
      drawH
    );
    ctx.restore();
  } else {
    const glyph = size * 0.5;
    drawItemTypeIcon(
      ctx,
      x + (size - glyph) / 2,
      y + (size - glyph) / 2,
      glyph,
      typeKey,
      accent,
      { color: accent, blur: 10 }
    );
  }

  roundRect(ctx, x, y, size, size, 12);
  ctx.strokeStyle = hexWithAlpha(accent, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function measureChip(ctx: Ctx, label: string): number {
  ctx.font = `700 10px ${MONO}`;
  return ctx.measureText(label).width + 24;
}

function drawChip(
  ctx: Ctx,
  x: number,
  y: number,
  label: string,
  color: string,
  withIcon: boolean
): number {
  ctx.font = `700 10px ${MONO}`;
  const iconSpace = withIcon ? 16 : 0;
  const w = ctx.measureText(label).width + 18 + iconSpace;
  drawRoundedRect(ctx, x, y, w, 20, 5, hexWithAlpha(color, 0.16), hexWithAlpha(color, 0.4));

  if (withIcon) {
    drawSparkleIcon(ctx, x + 8, y + 5, 10, color, { color, blur: 8 });
  }

  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 9 + iconSpace, y + 11);
  ctx.textBaseline = "top";
  return x + w + 6;
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
  while (ctx.measureText(text).width > 200 && text.length > 6) {
    text = text.slice(0, -4) + "...";
  }
  const w = ctx.measureText(text).width + 18;
  const x = rightX - w;
  drawRoundedRect(ctx, x, y, w, 20, 5, hexWithAlpha(color, 0.14));
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 9, y + 11);
  ctx.textBaseline = "top";
  return x;
}

function normalizeHex(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const trimmed = hex.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null;
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
      while (
        ctx.measureText(last + "...").width > maxWidth &&
        last.length > 4
      ) {
        last = last.slice(0, -2);
      }
      last = last + "...";
    }
    lines[maxLines - 1] = last;
  }

  return lines;
}
