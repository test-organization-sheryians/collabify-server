import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { UpdateChannelDescriptionInput, UpdateChannelDescriptionOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeUpdate } from "./steps/execute-update";

const log = createLogger("chat:services:update-channel-description");

/**
 * Update Channel Description Handler (Phase D)
 * Evaluates execution mapping internal generic logs targeting crashes securely cleanly across bounds properly.
 */
export const handler = async (
  input: UpdateChannelDescriptionInput,
  ctx: ServiceContext
): Promise<UpdateChannelDescriptionOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    await assertAccess(input, ctx);
    return await executeUpdate(input, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Extracted trace domain directly mapping missing limits locally handling exceptions perfectly.
    log.error("[chat:services:update-channel-description] Unexpected failure", {
      err,
      input: { channelId: input.channelId },
    });
    
    // Explicit system string crash trace mapped.
    throw new AppError("Failed to update channel description", "INTERNAL_SERVER_ERROR");
  }
};
