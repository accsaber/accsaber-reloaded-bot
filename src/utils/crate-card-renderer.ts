import type { ItemRarity } from "../types/api.js";
import { type CardResult, type CardUser, TEXT_PRIMARY, TEXT_TERTIARY, drawBody, loadOptionalImage, numberFmt, openFeedCard } from "./canvas-utils.js";
import { playerUrl } from "./embeds.js";

interface CrateCardModifier {
  key: string;
  name: string;
  colorHex?: string | null;
}

export interface CrateCardData {
  user: CardUser;
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

const RARITY_HEX: Record<ItemRarity, string> = {
  common: "#85809b",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#ffd700",
  mythic: "#ef4444",
};

const UNUSUAL_HEX = "#ffd27d";

const TYPE_LABEL: Record<string, string> = {
  item_pedestal: "Pedestal",
  profile_border_shape: "Border Shape",
  profile_border_color: "Border Color",
  profile_background: "Background",
  profile_thumbnail_background: "Thumbnail",
};

const HIDDEN_MODIFIERS = new Set(["normal"]);

function titleCase(key: string): string {
  return key
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function rarityLabel(rarity: ItemRarity): string {
  return titleCase(rarity);
}

export function itemTypeLabel(typeKey: string): string {
  return TYPE_LABEL[typeKey] ?? titleCase(typeKey);
}

export async function renderCrateCard(
  data: CrateCardData
): Promise<CardResult> {
  const { user, reward } = data;
  const accent = RARITY_HEX[reward.rarity] ?? RARITY_HEX.common;
  const worth = reward.worth ?? 0;

  const [{ ctx, finish }, itemImg] = await Promise.all([
    openFeedCard({
      user,
      level: data.level,
      title: data.title,
      titleColor: accent,
      subtitle: data.subtitle,
    }),
    loadOptionalImage(reward.iconUrl),
  ]);

  const bottom = drawBody(ctx, {
    art: { img: itemImg, fit: "contain", icon: reward.typeKey, color: accent },
    artSize: 72,
    title: [
      { text: reward.name },
      reward.quantity > 1 && { text: `×${reward.quantity}`, color: TEXT_TERTIARY, size: 13, weight: 500 },
    ],
    description: reward.description,
    lines: [
      [
        reward.unusualEffect && { text: reward.unusualEffect.name, color: UNUSUAL_HEX },
        ...reward.modifiers
          .filter((m) => !HIDDEN_MODIFIERS.has(m.key))
          .map((m) => ({ text: m.name, color: /^#[0-9a-f]{6}$/i.test(m.colorHex?.trim() ?? "") ? m.colorHex!.trim() : undefined })),
        worth > 0 && { text: `${numberFmt(worth, 0)} Essence`, color: TEXT_PRIMARY },
        reward.serialNumber != null && { text: `#${numberFmt(reward.serialNumber, 0)}`, color: TEXT_TERTIARY },
      ],
    ],
  });

  return {
    image: finish(bottom),
    profileUrl: playerUrl(user.id),
  };
}
