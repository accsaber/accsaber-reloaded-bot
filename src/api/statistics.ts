import type { UserCategoryStatisticsResponse } from "../types/api.js";
import { apiGet } from "./client.js";

export function getUserCategoryStatistics(
  userId: string,
  categoryCode: string
): Promise<UserCategoryStatisticsResponse> {
  return apiGet<UserCategoryStatisticsResponse>(
    `/users/${userId}/statistics?category=${encodeURIComponent(categoryCode)}`
  );
}
