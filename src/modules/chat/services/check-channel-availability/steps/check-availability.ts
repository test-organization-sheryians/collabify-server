import { AppError } from "@/shared/errors";
import { LockingService, createLockKeys } from "@/services/locking";
import { SlugUtil } from "@/shared/utils/slug.util";
import { checkRateLimit } from "@/shared/utils/rate-limiter";
import type { ServiceContext } from "@/graphql/types";
import type { CheckChannelAvailabilityInput, ChannelAvailabilityResponse } from "../types";

export const checkAvailability = async (
  input: CheckChannelAvailabilityInput,
  ctx: ServiceContext
): Promise<ChannelAvailabilityResponse> => {
  const { projectId, slug } = input;
  const { db, redis } = ctx;
  const userId = ctx.auth.userId!;

  const normalizedSlug = SlugUtil.sanitize(slug).toLowerCase();
  const keys = createLockKeys("channel", { type: "project", id: projectId });

  // 1. Rate Limit
  const allowed = await checkRateLimit(keys.rateLimit(userId), 20, 60); // 20 req/min
  if (!allowed) {
    return {
      available: false,
      message: "Too many attempts. Please wait.",
      reason: "RATE_LIMIT_EXCEEDED",
    };
  }

  // 2. Check Permanent DB (Hard Source of Truth)
  // Channels are unique per Project
  const existingDB = await db.chatConversation.findFirst({
    where: {
      projectId,
      type: "CHANNEL",
      name: { equals: normalizedSlug, mode: "insensitive" }, // Assuming name is the slug or unique identifier
    },
  });

  if (existingDB) {
    return {
      available: false,
      message: "Channel already exists",
      reason: "CHANNEL_NAME_TAKEN_PERMANENT",
    };
  }

  // 3. Attempt Reservation via LockingService (Rolling Reservation)
  // We need to know our PREVIOUS reservation to release it.
  const userResKey = keys.userReservation(userId);
  const previousSlug = await redis.get(userResKey);

  const lockKey = keys.resource(normalizedSlug);
  const ttl = 180; // 3 minutes

  const oldLockKey = previousSlug
    ? keys.resource(previousSlug)
    : `dummy:lock:${userId}`;

  try {
    const reserved = await LockingService.switch(
      oldLockKey,
      lockKey,
      userId,
      ttl,
      userResKey,
      normalizedSlug
    );

    if (!reserved) {
      return {
        available: false,
        message: "Channel name is currently reserved by another user",
        reason: "CHANNEL_NAME_RESERVATION_FAILED",
      };
    }

    return {
      available: true,
      reservationId: lockKey,
      message: "Channel name reserved for 3 minutes",
    };
  } catch (error) {
    throw new AppError("Internal Redis Error", "INTERNAL_SERVER_ERROR", 500);
  }
};
