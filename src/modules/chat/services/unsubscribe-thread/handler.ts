import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { UnsubscribeThreadInput, UnsubscribeThreadOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeUnsubscribe } from "./steps/execute-unsubscribe";

const log = createLogger("chat:services:unsubscribe-thread");

/**
 * Unsubscribe Thread Handler (Phase D)
 * Short-circuits target mappings mapping limits efficiently isolating drops and caching WS flushes correctly tracking errors gracefully globally.
 */
export const handler = async (
  input: UnsubscribeThreadInput,
  ctx: ServiceContext
): Promise<UnsubscribeThreadOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { isNotSubscribed } = await assertAccess(input, ctx);

    if (isNotSubscribed) {
      // Early bailout wrapping limits
      return {
        success: true,
        threadId: input.threadId,
        isSubscribed: false,
      };
    }

    return await executeUnsubscribe(input, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Extracted trace domain directly mapping missing limits locally handling exceptions perfectly.
    log.error("[chat:services:unsubscribe-thread] Unexpected failure", {
      err,
      input: { threadId: input.threadId },
    });
    
    throw err;
  }
};
