import type {
  StatsDiffResponse,
  UserCategoryStatisticsResponse,
} from "../types/api.js";
import { apiGet } from "./client.js";

export function getUserCategoryStatistics(
  userId: string,
  categoryCode: string
): Promise<UserCategoryStatisticsResponse> {
  return apiGet<UserCategoryStatisticsResponse>(
    `/users/${userId}/statistics?category=${encodeURIComponent(categoryCode)}`
  );
}

export function getUserStatsDiff(
  userId: string,
  categoryCode: string
): Promise<StatsDiffResponse | undefined> {
  return apiGet<StatsDiffResponse | undefined>(
    `/users/${userId}/stats-diff?category=${encodeURIComponent(categoryCode)}`
  );
}
