import type { Redis } from "ioredis";
import { keys } from "../cache/keys";

export async function invalidatePageCollaborator(
  pageId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.del(keys.pageCollab(pageId, userId));
  pipeline.del(keys.pageState(pageId));
  await pipeline.exec();
}

export async function invalidatePageState(
  pageId: string,
  redis: Redis
): Promise<void> {
  await redis.del(keys.pageState(pageId));
}
