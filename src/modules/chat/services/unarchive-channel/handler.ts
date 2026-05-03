import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { UnarchiveChannelInput, UnarchiveChannelOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeUnarchive } from "./steps/execute-unarchive";

const log = createLogger("chat:services:unarchive-channel");

/**
 * Unarchive Channel Handler (Phase D)
 * Evaluates target access scopes mapped inside Project boundaries correctly executing `<try/catch>` bounds tracing error IDs robustly mapping execution limits safely.
 */
export const handler = async (
  input: UnarchiveChannelInput,
  ctx: ServiceContext
): Promise<UnarchiveChannelOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { channel } = await assertAccess(input, ctx);
    return await executeUnarchive(input, channel, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Explicit tracing limits inside unknown throws natively
    log.error("[chat:services:unarchive-channel] Unexpected failure", {
      err,
      input: { channelId: input.channelId },
    });
    
    throw err;
  }
};
