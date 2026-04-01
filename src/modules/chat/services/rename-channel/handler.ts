import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { RenameChannelInput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeRename } from "./steps/execute-rename";

const log = createLogger("chat:services:rename-channel");

/**
 * Rename Channel Handler (Phase D)
 * Evaluates Project level limits natively isolating exceptions explicitly tracing target bounds.
 */
export const handler = async (
  input: RenameChannelInput,
  ctx: ServiceContext
) => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    await assertAccess(input, ctx);
    return await executeRename(input, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    log.error("[chat:services:rename-channel] Unexpected failure", {
      err,
      input: { channelId: input.channelId },
    });
    
    throw new AppError("Failed to rename channel", "INTERNAL_SERVER_ERROR");
  }
};
