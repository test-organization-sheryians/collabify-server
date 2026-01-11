import { redis } from "@/infra/redis";
import { db } from "@/infra/db";
import { REDIS_KEYS } from "../../core/constants";
import { logger } from "@/shared/logger";

// -----------------------------------------------------------------------------
// IDEMPOTENCY
// -----------------------------------------------------------------------------
export const checkIdempotency = async (
  eventId: string,
  jobId: string
): Promise<boolean> => {
  const lockKey = `${REDIS_KEYS.IDEMPOTENCY_PREFIX}${eventId}:decider`;
  const acquired = await redis.set(lockKey, "1", "EX", 86400, "NX");

  if (!acquired) {
    logger.debug({ jobId, eventId }, "Duplicate Decider Job Dropped");
    return false;
  }
  return true;
};

// -----------------------------------------------------------------------------
// RATE LIMITING
// -----------------------------------------------------------------------------
export const checkRateLimit = async (
  userId: string,
  type: string
): Promise<boolean> => {
  const RATE_LIMIT_WINDOW = 60;
  const RATE_LIMIT_MAX = 5;

  const rateKey = `rate:${userId}:${type}`;
  const requestCount = await redis.incr(rateKey);

  if (requestCount === 1) {
    await redis.expire(rateKey, RATE_LIMIT_WINDOW);
  }

  if (requestCount > RATE_LIMIT_MAX) {
    logger.warn(
      { userId, type, count: requestCount },
      "Rate limit exceeded, dropping notification"
    );
    return false;
  }
  return true;
};

// -----------------------------------------------------------------------------
// ACCESS CHECK
// -----------------------------------------------------------------------------
export const checkAccess = async (
  userId: string,
  type: string,
  strategy: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<boolean> => {
  if (strategy.requiresAccess === "workspace_member") {
    const workspaceId = (payload.workspaceId || payload.tenantId) as
      | string
      | undefined;
    if (workspaceId) {
      const member = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      if (!member) {
        logger.info(
          { userId, workspaceId, type },
          "Decider: User lost access to workspace, dropping notification."
        );
        return false;
      }
    }
  }
  return true;
};
