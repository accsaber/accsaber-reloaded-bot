import type {
  MilestoneCompletionResponse,
  MilestoneHolderResponse,
  Page,
} from "../types/api.js";
import { TTLCache } from "./cache.js";
import { apiGet } from "./client.js";

let completionStatsCache: TTLCache<MilestoneCompletionResponse[]> | null = null;
let completionStatsIndex: Map<string, MilestoneCompletionResponse> | null = null;
let inflight: Promise<MilestoneCompletionResponse[]> | null = null;

export function configureCompletionStatsCache(ttlMs: number): void {
  completionStatsCache = new TTLCache<MilestoneCompletionResponse[]>(ttlMs);
  completionStatsIndex = null;
}

export async function getCompletionStats(): Promise<MilestoneCompletionResponse[]> {
  if (!completionStatsCache) {
    completionStatsCache = new TTLCache<MilestoneCompletionResponse[]>(300_000);
  }
  const cached = completionStatsCache.get();
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = apiGet<MilestoneCompletionResponse[]>("/milestones/completion-stats")
    .then((stats) => {
      completionStatsCache!.set(stats);
      completionStatsIndex = new Map(stats.map((s) => [s.milestoneId, s]));
      return stats;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function getCompletionStatsById(
  milestoneId: string
): Promise<MilestoneCompletionResponse | undefined> {
  await getCompletionStats();
  return completionStatsIndex?.get(milestoneId);
}

export interface MilestoneHoldersOptions {
  page?: number;
  size?: number;
  sort?: string;
}

export function getMilestoneHolders(
  milestoneId: string,
  opts: MilestoneHoldersOptions = {}
): Promise<Page<MilestoneHolderResponse>> {
  const params = new URLSearchParams();
  if (opts.page !== undefined) params.set("page", String(opts.page));
  if (opts.size !== undefined) params.set("size", String(opts.size));
  if (opts.sort) params.set("sort", opts.sort);
  const qs = params.toString();
  return apiGet<Page<MilestoneHolderResponse>>(
    `/milestones/${milestoneId}/holders${qs ? `?${qs}` : ""}`
  );
}
