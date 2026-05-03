import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { ReopenThreadInput, ReopenThreadOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeReopen } from "./steps/execute-reopen";

const log = createLogger("chat:services:reopen-thread");

/**
 * Reopen Thread Handler (Phase D)
 * Evaluates Project level limits resolving `chat:channel:update`. Drops internal WS maps wrapped reliably across dynamic `createLogger` states matching upstream faults.
 */
export const handler = async (
  input: ReopenThreadInput,
  ctx: ServiceContext
): Promise<ReopenThreadOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { thread } = await assertAccess(input, ctx);
    return await executeReopen(input, thread, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Explicit trace blocks matching generic 500 server crashes dynamically logged cleanly downstream
    log.error("[chat:services:reopen-thread] Unexpected failure", {
      err,
      input: { threadId: input.threadId },
    });
    
    throw err;
  }
};
