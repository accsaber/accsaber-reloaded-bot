import type { ItemRarity } from "../types/api.js";
import {
  FEED_BODY_TOP,
  FEED_LEFT,
  FEED_RIGHT,
  MONO,
  SANS,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  type Ctx,
  type Img,
  drawCrateIcon,
  drawRightChip,
  drawRoundedRect,
  drawSparkleIcon,
  hexWithAlpha,
  loadOptionalImage,
  numberFmt,
  openFeedCard,
  roundRect,
  truncate,
  wrapText,
} from "./canvas-utils.js";
import { drawItemTypeIcon } from "./item-type-icons.js";

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
  const { user, crate, reward } = data;
  const accent = rarityHex(reward.rarity);
  const strongGlow = STRONG_GLOW_RARITIES.has(reward.rarity);
  const effect = reward.unusualEffect ?? null;
  const modifiers = reward.modifiers.filter((m) => !HIDDEN_MODIFIERS.has(m.key));

  const hasChips = modifiers.length > 0 || effect !== null;
  const worth = reward.worth ?? 0;

  const CARD_H =
    PAD - 2 + HEADER_H + ICON_SIZE + 14 + (hasChips ? CHIPS_ROW_H : 0) + FOOTER_H;

  const itemImg = await loadOptionalImage(reward.iconUrl);
  const { ctx, finish } = await openFeedCard(CARD_H, {
    user,
    level: data.level,
    title: data.title,
    titleColor: accent,
    subtitle: data.subtitle,
    chips: [{ label: rarityLabel(reward.rarity), color: accent }],
    wash: accent,
    washAlpha: strongGlow ? 0.2 : 0.16,
  });

  const leftX = FEED_LEFT;
  const rightEdge = FEED_RIGHT;
  let curY = FEED_BODY_TOP;

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

  return {
    image: await finish(),
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
  img: Img | null,
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

function normalizeHex(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const trimmed = hex.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null;
}

