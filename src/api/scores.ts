import type { Page, ScoreResponse } from "../types/api.js";
import { apiGet } from "./client.js";

export function getUserScores(
  userId: string,
  params: { categoryId?: string; size?: number; sort?: string } = {}
): Promise<Page<ScoreResponse>> {
  const query = new URLSearchParams();
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.size) query.set("size", String(params.size));
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return apiGet<Page<ScoreResponse>>(
    `/users/${userId}/scores${qs ? `?${qs}` : ""}`
  );
}
