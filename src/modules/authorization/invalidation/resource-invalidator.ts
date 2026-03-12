import type { Redis } from "ioredis";
import { invalidatePageState } from "./page-invalidator";
import { invalidateBoardState } from "./board-invalidator";

/**
 * Resource state invalidator — clears short-TTL resource state caches.
 * Call on archive/lock/delete mutations that affect permission conditions.
 */
export async function invalidateResourceState(
  resourceType: "page" | "board",
  resourceId: string,
  redis: Redis
): Promise<void> {
  if (resourceType === "page") {
    await invalidatePageState(resourceId, redis);
  } else if (resourceType === "board") {
    await invalidateBoardState(resourceId, redis);
  }
}
