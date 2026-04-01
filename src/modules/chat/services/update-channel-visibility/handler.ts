import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { UpdateChannelVisibilityInput, UpdateChannelVisibilityOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeVisibility } from "./steps/execute-visibility";

const log = createLogger("chat:services:update-channel-visibility");

/**
 * Update Channel Visibility Handler (Phase D)
 * Evaluates target maps mapping constraints inside tracking limit properly checking errors.
 */
export const handler = async (
  input: UpdateChannelVisibilityInput,
  ctx: ServiceContext
): Promise<UpdateChannelVisibilityOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { channel } = await assertAccess(input, ctx);
    return await executeVisibility(input, channel, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Extracted trace domain directly mapping missing limits locally handling exceptions perfectly.
    log.error("[chat:services:update-channel-visibility] Unexpected failure", {
      err,
      input: { channelId: input.channelId },
    });
    
    throw err;
  }
};
