import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { LeaveGroupInput, LeaveGroupOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeLeave } from "./steps/execute-leave";

const log = createLogger("chat:services:leave-group");

/**
 * Leave Group Handler
 *
 * User removes themselves from a group.
 * If last member leaves, group is automatically deleted.
 */
export const handler = async (
  input: LeaveGroupInput,
  ctx: ServiceContext
): Promise<LeaveGroupOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { group } = await assertAccess(input, ctx);
    return await executeLeave(input, group, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Log unexpected failures explicitly per Phase D error handling audit
    log.error("[chat:services:leave-group] Unexpected failure", {
      err,
      input: { groupId: input.groupId },
    });
    
    throw err;
  }
};
