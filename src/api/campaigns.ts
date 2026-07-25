import type { CampaignProgressResponse } from "../types/api.js";
import { apiGet } from "./client.js";

export function getCampaignProgress(
  slug: string,
  userId: string
): Promise<CampaignProgressResponse> {
  return apiGet<CampaignProgressResponse>(
    `/campaigns/slug/${encodeURIComponent(slug)}/users/${encodeURIComponent(userId)}/progress`
  );
}
