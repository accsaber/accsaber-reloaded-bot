import assert from "node:assert/strict";
import { buildClanEmbed, parseClanFrame } from "./services/clan-feed.js";
import type { ClanWarResponse, PlayerRef, PublicClanResponse } from "./types/api.js";

const ATK: PublicClanResponse = {
  id: "c1",
  slug: "neon-blades",
  name: "Neon Blades",
  tag: "NB",
  tagColor: "#22c55e",
  primaryColor: "#ff2e92",
  secondaryColor: null,
  iconUrl: "https://cdn.example.com/nb.png",
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
  avatarUrl: null,
  cdnAvatarUrl: null,
  country: "US",
  clan,
});

const war = (outcome: ClanWarResponse["outcome"]): ClanWarResponse => ({
  id: "w1",
  arena: "category_turf",
  ruleset: "berserker",
  outcome,
  declaredBy: player("76561198000000001", "PulseLane", ATK),
  attacker: { clan: ATK, lead: null, stake: 1499.6, stakeRemaining: 820.4, standingAtDeclare: 0 },
  defender: { clan: DEF, lead: null, stake: 1499.6, stakeRemaining: 0.2, standingAtDeclare: 0 },
  declaredAt: "2026-10-09T00:00:00Z",
  endedAt: null,
});

const frames: unknown[] = [
  { type: "war_declared", warId: "w1", data: war(null) },
  { type: "war_ended", warId: "w1", data: war("attacker_won") },
  { type: "war_ended", warId: "w1", data: war("defender_won") },
  { type: "war_ended", warId: "w1", data: war("drawn") },
  { type: "war_ended", warId: "w1", data: war("retreated") },
  { type: "war_ended", warId: "w1", data: war("forfeited") },
  { type: "war_ended", warId: "w1", data: war("season_ended") },
  {
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
  { type: "clan_founded", warId: null, data: [ATK] },
  { type: "alliance_formed", warId: null, data: [ATK, DEF] },
  { type: "alliance_ended", warId: null, data: [ATK, DEF] },
  { type: "rival_declared", warId: null, data: [DEF, ATK] },
  {
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
];

assert.equal(parseClanFrame({ type: "war", warId: "w1", data: {} }), null);
assert.equal(parseClanFrame({ type: "hit", warId: "w1", data: {} }), null);
assert.equal(parseClanFrame({ type: "something_new", warId: null, data: [] }), null);

const embeds = frames.map((raw) => {
  const frame = parseClanFrame(raw);
  assert.ok(frame);
  return buildClanEmbed(frame).toJSON();
});

for (const e of embeds) console.log(JSON.stringify(e, null, 2));

const [declared, atkWon, defWon, drawn, , , , broke, founded, , , , season] = embeds;
assert.equal(declared.title, "[NB] declares war on [AK]");
assert.equal(declared.color, 0xff2e92);
assert.ok(declared.fields?.some((f) => f.name === "Stake" && f.value === "`1,500`"));
assert.equal(atkWon.title, "[NB] defeats [AK]");
assert.equal(defWon.color, 0x3b82f6);
assert.equal(drawn.color, 0x6b7280);
assert.ok(drawn.description?.includes("`0` stake left"));
assert.equal(broke.title, "PulseLane broke under\\_score's guard");
assert.equal(broke.thumbnail?.url, "https://cdn.example.com/cover.jpg");
assert.ok(broke.description?.includes("Ghost · Expert+"));
assert.ok(broke.description?.includes("`42`"));
assert.ok(broke.description?.includes("[Acc \\[Kings\\]](https://accsaber.com/clans/acc_kings)"));
assert.equal(founded.title, "A new clan rises: [NB] Neon Blades");
assert.equal(season.color, 0xffd700);
assert.equal(season.description?.split("\n").length, 3);
assert.ok(season.description?.startsWith("🥇 [NB]"));
assert.ok(season.description?.includes("`12,346` standing"));

console.log("clan feed checks passed");
