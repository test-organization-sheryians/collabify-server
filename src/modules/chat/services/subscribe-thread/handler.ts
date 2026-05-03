import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { SubscribeThreadInput, SubscribeThreadOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeSubscribe } from "./steps/execute-subscribe";

const log = createLogger("chat:services:subscribe-thread");

/**
 * Subscribe Thread Handler (Phase D)
 * Evaluates `assertChannelMember` properly clearing duplicate connections mappings securely isolating trace bounds globally across internal trace limits seamlessly masking executions natively inside logger arrays.
 */
export const handler = async (
  input: SubscribeThreadInput,
  ctx: ServiceContext
): Promise<SubscribeThreadOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { isAlreadySubscribed } = await assertAccess(input, ctx);

    if (isAlreadySubscribed) {
      return {
        success: true,
        threadId: input.threadId,
        isSubscribed: true,
      };
    }

    return await executeSubscribe(input, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    log.error("[chat:services:subscribe-thread] Unexpected failure", {
      err,
      input: { threadId: input.threadId },
    });
    
    throw err;
  }
};
