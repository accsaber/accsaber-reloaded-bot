import type { CrateFeedFrame } from "../types/api.js";
import type { CrateFeedConfig } from "../types/config.js";
import {
  itemTypeLabel,
  rarityLabel,
  type CrateCardData,
} from "../utils/crate-card-renderer.js";
import { renderTemplate } from "../utils/templates.js";

export function isNoteworthyOpen(
  frame: CrateFeedFrame,
  cfg: CrateFeedConfig
): boolean {
  const reward = frame.open.reward;
  const allowed = new Set(cfg.rarities.map((r) => r.toLowerCase()));

  if (allowed.has(reward.item.rarity.toLowerCase())) return true;
  if (cfg.alwaysPostUnusual && reward.unusualEffect) return true;

  const serialCutoff = cfg.alwaysPostSerialBelow;
  return (
    serialCutoff !== undefined &&
    reward.serialNumber != null &&
    reward.serialNumber <= serialCutoff
  );
}

export function crateTemplateVars(
  frame: CrateFeedFrame
): Record<string, string | number> {
  const { player, open } = frame;
  const reward = open.reward;
  const rarity = rarityLabel(reward.item.rarity);

  return {
    playerName: player.name,
    rarity,
    article: /^[aeiou]/i.test(rarity) ? "an" : "a",
    itemName: reward.item.name,
    itemType: itemTypeLabel(reward.item.typeKey),
    crateName: open.crate.name,
    effectName: reward.unusualEffect?.name ?? "",
    modifiers: reward.modifiers
      .filter((m) => m.key !== "normal")
      .map((m) => m.name)
      .join(", "),
    serialNumber: reward.serialNumber ?? "",
  };
}

export function buildCrateCardData(
  frame: CrateFeedFrame,
  cfg: Pick<CrateFeedConfig, "messageTemplate" | "unusualSubtitleTemplate">,
  level?: number
): CrateCardData {
  const { player, open } = frame;
  const reward = open.reward;
  const vars = crateTemplateVars(frame);

  const title = renderTemplate(cfg.messageTemplate, vars);
  const subtitle =
    reward.unusualEffect && cfg.unusualSubtitleTemplate
      ? renderTemplate(cfg.unusualSubtitleTemplate, vars)
      : undefined;

  return {
    user: {
      id: player.id,
      name: player.name,
      country: player.country,
      avatarUrl: player.cdnAvatarUrl ?? player.avatarUrl,
    },
    crate: {
      name: open.crate.name,
      rarity: open.crate.rarity,
      iconUrl: open.crate.iconUrl,
    },
    reward: {
      name: reward.item.name,
      description: reward.item.description,
      iconUrl: reward.item.iconUrl,
      typeKey: reward.item.typeKey,
      rarity: reward.item.rarity,
      worth: reward.item.worth,
      serialNumber: reward.serialNumber,
      quantity: reward.quantity,
      modifiers: reward.modifiers,
      unusualEffect: reward.unusualEffect,
    },
    title,
    subtitle,
    level,
  };
}
