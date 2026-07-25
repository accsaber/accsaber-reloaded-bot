import { mkdirSync, writeFileSync } from "node:fs";
import {
  CAMPAIGN_COMPLETED,
  CampaignMilestoneTracker,
  NODE_COMPLETED,
  buildCompletionCardData,
  buildMilestoneCardData,
  ignoredLabelSet,
  isAnnounceableCompletion,
  isEligibleForMilestones,
  milestoneRuleFor,
} from "./services/campaign-rules.js";
import type {
  CampaignDifficultyProgressResponse,
  CampaignFeedFrame,
  CampaignProgressResponse,
} from "./types/api.js";
import type { CampaignFeedConfig } from "./types/config.js";
import { renderCampaignCard } from "./utils/campaign-card-renderer.js";

const CFG: CampaignFeedConfig = {
  enabled: true,
  channelId: "0",
  maxCompletedAgeSeconds: 600,
  rules: {
    sealMilestone: {
      enabled: true,
      campaignSlug: "acc-champ-community-campaign",
      labels: ["Mercenary", "Acc Champ", "Elder", "God", "Celestial"],
      messageTemplate: "Earned a seal in {campaignName}",
      color: "#f59e0b",
    },
    milestone: {
      enabled: true,
      ignoredLabels: ["start"],
      messageTemplate: "Hit a checkpoint in {campaignName}",
      color: "#a855f7",
    },
    completion: {
      enabled: true,
      messageTemplate: "Finished a campaign by {creatorName}",
      color: "#22c55e",
    },
  },
};

const API = process.env.ACCSABER_API ?? "https://api.accsaber.com/v1";
const SLUG = process.env.TEST_CAMPAIGN_SLUG ?? "acc-champ-community-campaign";
const USER = process.env.TEST_USER ?? "76561198012241978";

const PLAYER = {
  userId: USER,
  userName: "PulseLane",
  country: "us",
  avatarUrl: "https://cdn.assets.beatleader.com/76561198012241978R10.png",
};

async function fetchProgress(): Promise<CampaignProgressResponse> {
  const res = await fetch(`${API}/campaigns/slug/${SLUG}/users/${USER}/progress`);
  if (!res.ok) throw new Error(`progress request failed: ${res.status}`);
  return (await res.json()) as CampaignProgressResponse;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withNodeCompleted(
  progress: CampaignProgressResponse,
  nodeId: string
): CampaignProgressResponse {
  const copy = clone(progress);
  for (const entry of copy.difficulties) {
    if (entry.node.id !== nodeId) continue;
    entry.completed = true;
    entry.pathCompleted = true;
    entry.unlocked = true;
    entry.rewardsEarned = true;
    if (entry.userValue == null && entry.node.requirementValue != null) {
      entry.userValue = entry.node.requirementValue + 0.0021;
    }
  }
  copy.completedDifficulties = copy.difficulties.filter((d) => d.completed).length;
  return copy;
}

function nodeFrame(
  progress: CampaignProgressResponse,
  entry: CampaignDifficultyProgressResponse,
  overrides: Partial<CampaignFeedFrame["campaign"]> = {}
): CampaignFeedFrame {
  return {
    type: NODE_COMPLETED,
    player: PLAYER,
    campaign: { ...clone(progress.campaign), ...overrides },
    node: clone(entry.node),
    completedAt: new Date().toISOString(),
  };
}

function completionFrame(
  progress: CampaignProgressResponse,
  overrides: Partial<CampaignFeedFrame["campaign"]> = {}
): CampaignFeedFrame {
  return {
    type: CAMPAIGN_COMPLETED,
    player: PLAYER,
    campaign: { ...clone(progress.campaign), ...overrides },
    completedAt: new Date().toISOString(),
  };
}

function findLabelled(
  progress: CampaignProgressResponse,
  label: string
): CampaignDifficultyProgressResponse | undefined {
  return progress.difficulties.find(
    (d) => d.node.checkpointLabel?.trim().toLowerCase() === label.toLowerCase()
  );
}

async function render(name: string, data: Parameters<typeof renderCampaignCard>[0]) {
  const result = await renderCampaignCard(data);
  const path = `test-output/campaign-${name}.png`;
  writeFileSync(path, result.image);
  console.log(`  -> ${path}`);
}

async function main() {
  mkdirSync("test-output", { recursive: true });

  const base = await fetchProgress();
  console.log(
    `Fetched ${SLUG}: ${base.difficulties.length} nodes, ${base.completedDifficulties} completed, status=${base.progressStatus}\n`
  );

  const labels = ["Mercenary", "Acc Champ", "Elder", "God", "Celestial"];

  for (const label of labels) {
    const entry = findLabelled(base, label);
    if (!entry) {
      console.log(`Skipping ${label} (no node with that checkpoint label)`);
      continue;
    }

    const progress = withNodeCompleted(base, entry.node.id);
    const frame = nodeFrame(progress, entry);
    const tracker = new CampaignMilestoneTracker();
    const candidates = tracker.candidates(
      USER,
      progress,
      entry.node.id,
      ignoredLabelSet(CFG)
    );
    const repeat = tracker.candidates(
      USER,
      progress,
      entry.node.id,
      ignoredLabelSet(CFG)
    );
    const candidate = candidates[0];

    console.log(
      `${label}: eligible=${isEligibleForMilestones(frame, CFG)}, candidates=${candidates.length}, repeat=${repeat.length}, rule=${candidate ? milestoneRuleFor(frame, candidate.label, CFG) : "n/a"}`
    );
    if (!candidate) continue;

    const rule = milestoneRuleFor(frame, candidate.label, CFG)!;
    await render(
      `seal-${label.toLowerCase().replace(/\s+/g, "-")}`,
      buildMilestoneCardData(frame, candidate, rule, CFG, {
        level: 96,
        category: { name: "Tech Acc", code: "tech_acc" },
        progress,
      })
    );
  }

  const elder = findLabelled(base, "Elder");
  if (elder) {
    const progress = withNodeCompleted(base, elder.node.id);
    const frame = nodeFrame(progress, elder, {
      slug: "some-other-campaign",
      name: "A Community Curated Campaign With A Very Long Name",
      status: "CURATED",
      official: false,
    });
    const candidate = { label: "Elder", entry: elder };
    const rule = milestoneRuleFor(frame, candidate.label, CFG)!;
    console.log(`Curated non-seal milestone rule: ${rule}`);
    await render(
      "curated-milestone",
      buildMilestoneCardData(frame, candidate, rule, CFG, {
        level: 44,
        progress,
      })
    );
  }

  if (elder) {
    const progress = withNodeCompleted(base, elder.node.id);
    const bare = clone(elder);
    delete bare.node.checkpointAvatarUrl;
    const frame = nodeFrame(progress, bare);
    const rule = milestoneRuleFor(frame, "Elder", CFG)!;
    console.log("Milestone without checkpoint icon -> map cover fallback");
    await render(
      "milestone-no-icon",
      buildMilestoneCardData(frame, { label: "Elder", entry: bare }, rule, CFG, {
        level: 60,
        category: { name: "True Acc", code: "true_acc" },
        progress,
      })
    );
  }

  const start = findLabelled(base, "Start");
  if (start) {
    const progress = withNodeCompleted(base, start.node.id);
    const tracker = new CampaignMilestoneTracker();
    const candidates = tracker.candidates(
      USER,
      progress,
      start.node.id,
      ignoredLabelSet(CFG)
    );
    console.log(`Ignored label "Start" -> candidates=${candidates.length}`);
  }

  const completed = clone(base);
  completed.progressStatus = "COMPLETED";
  completed.completedAt = new Date().toISOString();
  completed.startedAt = new Date(Date.now() - 5 * 86_400_000).toISOString();
  completed.completedDifficulties = completed.campaign.difficultyCount;

  const completionOfficial = completionFrame(completed);
  console.log(
    `Official completion announceable: ${isAnnounceableCompletion(completionOfficial, CFG)}`
  );
  await render(
    "completion-official",
    buildCompletionCardData(completionOfficial, CFG, {
      level: 88,
      category: { name: "Overall", code: "overall" },
      progress: completed,
    })
  );

  const draftFrame = completionFrame(completed, {
    slug: "unofficial-draft",
    name: "Unofficial Draft Campaign",
    status: "DRAFT",
    official: false,
  });
  console.log(
    `Draft completion announceable: ${isAnnounceableCompletion(draftFrame, CFG)}`
  );

  const noProgressFrame = completionFrame(completed, {
    slug: "curated-no-progress",
    name: "Curated Campaign Without Progress Data",
    status: "CURATED",
    official: false,
    iconUrl: undefined,
    summary: undefined,
  });
  await render(
    "completion-no-progress",
    buildCompletionCardData(noProgressFrame, CFG, { level: 12, progress: null })
  );

  console.log("\nDone! Check the test-output/ directory.");
}

main().catch(console.error);
