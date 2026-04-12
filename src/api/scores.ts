import type { MapDifficultyResponse, Page, ScoreResponse } from "../types/api.js";
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

export async function getMapDifficultyComplexity(
  mapId: string,
  difficultyId: string
): Promise<number | undefined> {
  const diffs = await apiGet<MapDifficultyResponse[]>(`/maps/${mapId}/difficulties`);
  return diffs.find((d) => d.id === difficultyId)?.complexity;
}

export function getUserHistoricScores(
  userId: string,
  mapDifficultyId: string,
  params: { amount?: number; unit?: string } = {}
): Promise<ScoreResponse[]> {
  const query = new URLSearchParams();
  query.set("mapDifficultyId", mapDifficultyId);
  if (params.amount) query.set("amount", String(params.amount));
  if (params.unit) query.set("unit", params.unit);
  return apiGet<ScoreResponse[]>(
    `/users/${userId}/scores/historic?${query.toString()}`
  );
}

export function getMapLeaderboard(
  difficultyId: string,
  params: { page?: number; size?: number; sort?: string } = {}
): Promise<Page<ScoreResponse>> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size) query.set("size", String(params.size));
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return apiGet<Page<ScoreResponse>>(
    `/maps/difficulties/${difficultyId}/scores${qs ? `?${qs}` : ""}`
  );
}
