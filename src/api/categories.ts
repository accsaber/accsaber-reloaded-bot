import { config } from "../config.js";
import type { CategoryResponse } from "../types/api.js";
import { TTLCache } from "./cache.js";
import { apiGet } from "./client.js";

const cache = new TTLCache<CategoryResponse[]>(config.api.cacheTtlMs);

export async function getCategories(): Promise<CategoryResponse[]> {
  const cached = cache.get();
  if (cached) return cached;

  const categories = await apiGet<CategoryResponse[]>("/categories");
  cache.set(categories);
  return categories;
}

export async function getCategoryCodeById(
  id: string
): Promise<string | undefined> {
  const categories = await getCategories();
  return categories.find((c) => c.id === id)?.code;
}

export async function getCategoryNameById(
  id: string
): Promise<string | undefined> {
  const categories = await getCategories();
  return categories.find((c) => c.id === id)?.name;
}
