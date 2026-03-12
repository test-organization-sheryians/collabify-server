import type { Redis } from "ioredis";
import { keys } from "../cache/keys";

/** Invalidates project membership + meta + role-at-scope keys */
export async function invalidateProjectMember(
  projectId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.del(keys.projectMember(projectId, userId));
  pipeline.del(keys.projectMeta(projectId));
  pipeline.del(keys.roleAtScope(projectId, userId));
  await pipeline.exec();
}
