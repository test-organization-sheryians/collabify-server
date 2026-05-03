import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { RemoveGroupMemberInput, RemoveGroupMemberOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeRemove } from "./steps/execute-remove";

const log = createLogger("chat:services:remove-group-member");

/**
 * Remove Group Member Handler (Phase D)
 * Evaluates Project level limits resolving `chat:channel:member:remove`, drops DB targets dynamically clearing Redis explicitly.
 */
export const handler = async (
  input: RemoveGroupMemberInput,
  ctx: ServiceContext
): Promise<RemoveGroupMemberOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { group } = await assertAccess(input, ctx);
    return await executeRemove(input, group, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    log.error("[chat:services:remove-group-member] Unexpected failure", {
      err,
      input: { groupId: input.groupId, userId: input.userId },
    });
    
    throw err;
  }
};
