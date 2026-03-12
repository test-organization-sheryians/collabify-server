import type { Redis } from "ioredis";
import { RESOURCE_STATE_TTL } from "./ttl";

/**
 * Generic resource state R/W (page state, board state).
 * Short TTL (30s) because isLocked / isArchived change frequently.
 */

export async function getResourceState<T>(
  cacheKey: string,
  redis: Redis
): Promise<T | null> {
  const raw = await redis.get(cacheKey);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function setResourceState<T>(
  cacheKey: string,
  value: T,
  redis: Redis
): Promise<void> {
  await redis.set(
    cacheKey,
    JSON.stringify(value),
    "EX",
    RESOURCE_STATE_TTL,
    "NX"
  );
}

export async function deleteResourceState(
  cacheKey: string,
  redis: Redis
): Promise<void> {
  await redis.del(cacheKey);
}
