import { mkdirSync, writeFileSync } from "node:fs";
import { buildCrateCardData, isNoteworthyOpen } from "./services/crate-rules.js";
import type {
  CrateFeedFrame,
  ItemModifierRef,
  ItemResponse,
  UnusualEffectRef,
} from "./types/api.js";
import type { CrateFeedConfig } from "./types/config.js";
import { renderCrateCard } from "./utils/crate-card-renderer.js";

const CFG: CrateFeedConfig = {
  enabled: true,
  channelId: "0",
  rarities: ["legendary", "mythic"],
  alwaysPostUnusual: true,
  alwaysPostSerialBelow: 10,
  messageTemplate: "Just unboxed {article} {rarity} {itemType} from {crateName}!",
  unusualSubtitleTemplate: "Rolled an Unusual: {effectName}",
};

const PLAYER_ID = "76561198012241978";

const MODIFIERS: Record<string, ItemModifierRef> = {
  unusual: {
    id: "aa01",
    key: "unusual",
    name: "Unusual",
    colorHex: "#8650ac",
    effectSpec: null,
  },
  vintage: {
    id: "aa02",
    key: "vintage",
    name: "Vintage",
    colorHex: "#476291",
    effectSpec: null,
  },
  strange: {
    id: "aa03",
    key: "strange",
    name: "Strange",
    colorHex: "#cf6a32",
    effectSpec: null,
  },
  holographic: {
    id: "aa04",
    key: "holographic",
    name: "Holographic",
    colorHex: "#e879f9",
    effectSpec: null,
  },
  founders: {
    id: "aa05",
    key: "founders",
    name: "Founder's",
    colorHex: "#ff8800",
    effectSpec: null,
  },
  normal: {
    id: "aa06",
    key: "normal",
    name: "Normal",
    colorHex: "#9ca3af",
    effectSpec: null,
  },
};

const FIERY: UnusualEffectRef = {
  id: "cc09",
  key: "fiery",
  name: "Fiery",
  effectSpec: { contractVersion: 1, compositions: [] },
};

const ANGELIC: UnusualEffectRef = {
  id: "cc10",
  key: "angelic",
  name: "Angelic",
  effectSpec: { contractVersion: 1, compositions: [] },
};

function item(overrides: Partial<ItemResponse>): ItemResponse {
  return {
    id: "5e70",
    typeId: "22aa",
    typeKey: "title",
    name: "Unnamed Item",
    description: null,
    iconUrl: null,
    value: null,
    rarity: "common",
    worth: null,
    requirement: null,
    unlockLevel: null,
    createdAt: "2026-06-12T00:00:00Z",
    tradeable: true,
    visible: true,
    active: true,
    deprecated: false,
    stackable: false,
    welcomeGrant: false,
    missionPoolable: false,
    downloadable: false,
    uniquePerUser: false,
    serialized: false,
    ...overrides,
  };
}

const ALPHA_CRATE = item({
  id: "9a2e",
  typeKey: "crate",
  name: "Alpha Crate",
  rarity: "rare",
  worth: 50,
  stackable: true,
});

const API = process.env.ACCSABER_API ?? "https://api.accsaber.com/v1";

async function fetchCatalog(): Promise<Map<string, ItemResponse>> {
  const res = await fetch(`${API}/items?size=500`);
  if (!res.ok) throw new Error(`items request failed: ${res.status}`);
  const body = (await res.json()) as ItemResponse[] | { content: ItemResponse[] };
  const list = Array.isArray(body) ? body : body.content;
  return new Map(list.map((i) => [i.name, i]));
}

interface Scenario {
  name: string;
  reward: ItemResponse | string;
  crate?: ItemResponse;
  modifiers?: ItemModifierRef[];
  unusualEffect?: UnusualEffectRef | null;
  serialNumber?: number | null;
  quantity?: number;
  playerName?: string;
  country?: string | null;
  level?: number;
}

const SCENARIOS: Scenario[] = [
  {
    name: "mythic-unusual-serialized",
    reward: "ACC God Saber",
    modifiers: [MODIFIERS.unusual],
    unusualEffect: FIERY,
    serialNumber: 7,
    level: 105,
  },
  {
    name: "legendary-title-multi-modifier",
    reward: "Since Alpha",
    modifiers: [MODIFIERS.vintage, MODIFIERS.strange, MODIFIERS.founders],
    serialNumber: 3,
    level: 72,
  },
  {
    name: "mythic-cosmic-border-color",
    reward: "Galaxy",
    modifiers: [MODIFIERS.unusual, MODIFIERS.holographic],
    unusualEffect: ANGELIC,
    level: 88,
  },
  {
    name: "mythic-border-shape-blackhole",
    reward: "Black Hole",
    modifiers: [MODIFIERS.founders],
    serialNumber: 2,
    level: 96,
  },
  {
    name: "epic-border-shape-arcade",
    reward: "Arcade",
    modifiers: [MODIFIERS.strange],
    quantity: 1,
    level: 41,
  },
  {
    name: "rare-theme-stacked",
    reward: "Starry Night",
    modifiers: [MODIFIERS.normal],
    quantity: 4,
    level: 22,
  },
  {
    name: "mythic-badge-with-asset",
    reward: "ACC Celestial",
    modifiers: [MODIFIERS.unusual],
    unusualEffect: FIERY,
    serialNumber: 1,
    level: 96,
  },
  {
    name: "epic-shape-rain",
    reward: "Rainy Day",
    modifiers: [MODIFIERS.vintage, MODIFIERS.holographic],
    unusualEffect: ANGELIC,
    serialNumber: 1234,
    quantity: 2,
    playerName: "AVeryLongPlayerNameIndeed",
    country: "jp",
    level: 63,
  },
  {
    name: "legendary-long-text",
    reward: item({
      typeKey: "profile_thumbnail_background",
      name: "The Exceptionally Long Item Name That Must Truncate Cleanly",
      description:
        "A deliberately verbose description that should wrap onto exactly two lines and then be cut off with an ellipsis instead of overflowing the card boundary in any direction.",
      rarity: "legendary",
      worth: 175,
    }),
    modifiers: [
      MODIFIERS.vintage,
      MODIFIERS.strange,
      MODIFIERS.holographic,
      MODIFIERS.founders,
    ],
    serialNumber: 9,
    level: 63,
  },
  {
    name: "legendary-minimal-perk",
    reward: item({
      typeKey: "perk",
      name: "+1 Pinned Score Slot",
      rarity: "legendary",
      value: { effect: "pinned_score_slot", amount: 1 },
    }),
    modifiers: [],
    country: null,
    level: 8,
  },
];

function toWireFrame(
  s: Scenario,
  catalog: Map<string, ItemResponse>,
  type = "crate_opened"
): string {
  const reward =
    typeof s.reward === "string"
      ? (catalog.get(s.reward) ??
        item({ name: `${s.reward} (missing)`, rarity: "common" }))
      : s.reward;
  const frame: CrateFeedFrame = {
    type,
    player: {
      id: PLAYER_ID,
      name: s.playerName ?? "PulseLane",
      avatarUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
      cdnAvatarUrl: null,
      country: s.country === undefined ? "us" : s.country,
    },
    open: {
      id: `open-${s.name}`,
      crate: s.crate ?? ALPHA_CRATE,
      consumedLinkId: "77cc",
      reward: {
        linkId: "b41d",
        item: reward,
        modifiers: s.modifiers ?? [],
        unusualEffect: s.unusualEffect ?? null,
        serialNumber: s.serialNumber ?? null,
        quantity: s.quantity ?? 1,
        counters: null,
        source: "crate_drop",
        sourceId: "77cc",
        awardedByStaffId: null,
        reason: "Opened from crate",
        awardedAt: new Date().toISOString(),
        variantKey: null,
      },
      rolledAt: new Date().toISOString(),
    },
  };

  return JSON.stringify(frame);
}

async function main() {
  mkdirSync("test-output", { recursive: true });

  const catalog = await fetchCatalog();
  console.log(`Fetched ${catalog.size} items from ${API}\n`);

  const unknown = JSON.parse(
    toWireFrame(SCENARIOS[0], catalog, "crate_shredded")
  ) as CrateFeedFrame;
  console.log(
    `Unknown frame type "${unknown.type}" -> ${unknown.type === "crate_opened" ? "HANDLED (wrong!)" : "ignored"}`
  );

  for (const scenario of SCENARIOS) {
    const frame = JSON.parse(toWireFrame(scenario, catalog)) as CrateFeedFrame;
    const posts = isNoteworthyOpen(frame, CFG);
    const data = buildCrateCardData(frame, CFG, scenario.level);

    console.log(`Rendering ${scenario.name} (feed would post: ${posts ? "yes" : "no"})`);
    const result = await renderCrateCard(data);
    const path = `test-output/crate-${scenario.name}.png`;
    writeFileSync(path, result.image);
    console.log(`  -> ${path}`);
  }

  console.log("\nDone! Check the test-output/ directory.");
}

main().catch(console.error);
