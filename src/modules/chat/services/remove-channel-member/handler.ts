import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { RemoveChannelMemberInput, RemoveChannelMemberOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeRemove } from "./steps/execute-remove";

const log = createLogger("chat:services:remove-channel-member");

/**
 * Remove Channel Member Handler (Phase D)
 * Evaluates Project level limits resolving `chat:channel:member:remove`, drops Prisma DB targets natively clearing Redis `authGate` state automatically.
 */
export const handler = async (
  input: RemoveChannelMemberInput,
  ctx: ServiceContext
): Promise<RemoveChannelMemberOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { channel } = await assertAccess(input, ctx);
    return await executeRemove(input, channel, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Explicitly trace dropped bounds safely via global orchestrator logs natively
    log.error("[chat:services:remove-channel-member] Unexpected failure", {
      err,
      input: { channelId: input.channelId, userId: input.userId },
    });
    
    throw err;
  }
};
