import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildClanPost, parseClanFrame } from "./services/clan-feed.js";
import type { ClanWarResponse, ClanWarSideResponse, PlayerRef, PublicClanResponse } from "./types/api.js";
import { renderClanCard } from "./utils/clan-card-renderer.js";

const ATK: PublicClanResponse = {
  id: "c1",
  slug: "neon-blades",
  name: "Neon Blades",
  tag: "NB",
  tagColor: "#22c55e",
  primaryColor: "#ff2e92",
  secondaryColor: null,
  iconUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
  bannerUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
};

const DEF: PublicClanResponse = {
  id: "c2",
  slug: "acc_kings",
  name: "Acc [Kings]",
  tag: "AK",
  tagColor: "#3b82f6",
  primaryColor: null,
  secondaryColor: null,
  iconUrl: null,
};

const player = (id: string, name: string, clan: PublicClanResponse): PlayerRef => ({
  id,
  name,
  avatarUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
  cdnAvatarUrl: null,
  country: "US",
  clan,
});

const side = (
  clan: PublicClanResponse,
  team: ClanWarSideResponse["team"],
  stakeRemaining: number
): ClanWarSideResponse => ({
  clan,
  team,
  lead: null,
  stake: 1499.6,
  stakeRemaining,
  standingAtDeclare: 0,
  fallen: false,
});

const war = (outcome: ClanWarResponse["outcome"]): ClanWarResponse => ({
  id: "w1",
  arena: "category_turf",
  ruleset: "berserker",
  outcome,
  declaredBy: player("76561198000000001", "PulseLane", ATK),
  attack: {
    lead: ATK,
    stake: 1499.6,
    stakeRemaining: 820.4,
    sides: [side(ATK, "attack", 820.4)],
  },
  defend: {
    lead: null,
    stake: 1499.6,
    stakeRemaining: 0.2,
    sides: [side(DEF, "defend", 0.2)],
  },
  declaredAt: "2026-10-09T00:00:00Z",
  endedAt: null,
});

const frames: { name: string; raw: unknown }[] = [
  { name: "war-declared", raw: { type: "war_declared", warId: "w1", data: war(null) } },
  { name: "war-attacker-won", raw: { type: "war_ended", warId: "w1", data: war("attacker_won") } },
  { name: "war-defender-won", raw: { type: "war_ended", warId: "w1", data: war("defender_won") } },
  { name: "war-drawn", raw: { type: "war_ended", warId: "w1", data: war("drawn") } },
  { name: "war-retreated", raw: { type: "war_ended", warId: "w1", data: war("retreated") } },
  { name: "war-forfeited", raw: { type: "war_ended", warId: "w1", data: war("forfeited") } },
  { name: "war-season-ended", raw: { type: "war_ended", warId: "w1", data: war("season_ended") } },
  {
    name: "war-break",
    raw: {
      type: "war_break",
      warId: "w1",
      data: {
        id: "h1",
        attacker: player("76561198000000001", "PulseLane", ATK),
        victim: player("76561198000000002", "under_score", DEF),
        difficulty: {
          id: "d1",
          mapId: "m1",
          songName: "Ghost",
          songAuthor: "Camellia",
          mapAuthor: "Someone",
          coverUrl: "https://cdn.example.com/cover.jpg",
          cdnCoverUrl: null,
          difficulty: "EXPERT_PLUS",
        },
        broke: true,
        standingMoved: 41.7,
        createdAt: "2026-10-09T00:00:00Z",
      },
    },
  },
  { name: "founded", raw: { type: "clan_founded", warId: null, data: [ATK] } },
  { name: "alliance-formed", raw: { type: "alliance_formed", warId: null, data: [ATK, DEF] } },
  { name: "alliance-ended", raw: { type: "alliance_ended", warId: null, data: [ATK, DEF] } },
  { name: "rival-declared", raw: { type: "rival_declared", warId: null, data: [DEF, ATK] } },
  {
    name: "season-closed",
    raw: {
      type: "season_closed",
      warId: null,
      data: {
        season: { id: "s1", name: "Season 1", slug: "season-1" },
        top: [
          { clan: DEF, rank: 2, standing: 9000.4 },
          { clan: ATK, rank: 1, standing: 12345.5 },
          { clan: DEF, rank: 3, standing: 100 },
          { clan: ATK, rank: 4, standing: 1 },
        ],
      },
    },
  },
];

assert.equal(parseClanFrame({ type: "war", warId: "w1", data: {} }), null);
assert.equal(parseClanFrame({ type: "hit", warId: "w1", data: {} }), null);
assert.equal(parseClanFrame({ type: "something_new", warId: null, data: [] }), null);

const posts = frames.map(({ raw }) => {
  const frame = parseClanFrame(raw);
  assert.ok(frame);
  return buildClanPost(frame);
});

const [declared, atkWon, defWon, drawn, , , , broke, founded, , , , season] = posts.map((p) => p.card);
assert.equal(declared.headerTitle, "Declared war on [AK]");
assert.equal(declared.accent, "#ff2e92");
assert.equal(declared.value?.amount, 1499.6);
assert.equal(posts[0].link.url, "https://accsaber.com/clans/wars/w1");
assert.equal(atkWon.headerTitle, "Defeated [AK]");
assert.equal(defWon.accent, "#3b82f6");
assert.equal(drawn.accent, "#6b7280");
assert.ok(drawn.description?.includes("[AK] 0 stake left"));
assert.equal(broke.headerTitle, "Broke under_score's guard");
assert.equal(broke.coverUrl, "https://cdn.example.com/cover.jpg");
assert.ok(broke.description?.includes("Expert+"));
assert.equal(founded.header.name, "[NB] Neon Blades");
assert.equal(posts[8].link.url, "https://accsaber.com/clans/neon-blades");
assert.equal(season.header.name, "[NB] Neon Blades");
assert.equal(season.value?.amount, 12345.5);
assert.equal(season.description, "#2 [AK] Acc [Kings] - 9,000 · #3 [AK] Acc [Kings] - 100");

console.log("clan feed checks passed");

async function main() {
  mkdirSync("test-output", { recursive: true });
  for (let i = 0; i < frames.length; i++) {
    const path = `test-output/clan-${frames[i].name}.png`;
    writeFileSync(path, await renderClanCard(posts[i].card));
    console.log(`  -> ${path}`);
  }
}

main().catch(console.error);
