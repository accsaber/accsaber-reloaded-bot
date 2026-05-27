import { apiGet, apiPost } from "./client.js";

export type SupporterTierCode = "bronze" | "silver" | "gold";

export interface UserSupporterStateResponse {
  currentTier: SupporterTierCode | null;
  currentTierDisplayName: string | null;
  balanceCents: number;
  lifetimeSupportedCents: number;
  hasEverSupported: boolean;
}

export function getUserSupporterState(
  userId: string
): Promise<UserSupporterStateResponse> {
  return apiGet<UserSupporterStateResponse>(`/users/${userId}/supporter`);
}

export interface ClaimByRoleRequest {
  discordId: string;
  tierName: string;
  assignedAt?: string;
}

export interface ClaimByRoleResponse {
  matched: boolean;
  kofiTransactionId?: string;
}

export interface AssignRequest {
  kofiTransactionId: string;
  discordId: string;
}

export function claimSupporterByRole(
  body: ClaimByRoleRequest
): Promise<ClaimByRoleResponse> {
  return apiPost<ClaimByRoleResponse>("/supporters/claim-by-role", body, {
    serviceAuth: true,
  });
}

export function assignSupporter(body: AssignRequest): Promise<void> {
  return apiPost<void>("/supporters/assign", body, { serviceAuth: true });
}
