import type { Redis } from "ioredis";
import { keys } from "../cache/keys";

/** Invalidates workspace membership + meta + owner bypass + role-at-scope keys */
export async function invalidateWorkspaceMember(
  workspaceId: string,
  userId: string,
  redis: Redis
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.del(keys.workspaceMember(workspaceId, userId));
  pipeline.del(keys.workspaceMeta(workspaceId));
  pipeline.del(keys.ownerBypass(workspaceId, userId));
  pipeline.del(keys.roleAtScope(workspaceId, userId)); // clear cached role name so new role is picked up immediately
  await pipeline.exec();
}
