import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { RenameGroupInput, RenameGroupOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeRename } from "./steps/execute-rename";

const log = createLogger("chat:services:rename-group");

/**
 * Rename Group Handler (Phase D)
 * Evaluates Project level limits resolving `chat:channel:update`. Drops internal Prisma updates and mapped WS traces inside explicit internal log tracking accurately resolving WS leaks natively.
 */
export const handler = async (
  input: RenameGroupInput,
  ctx: ServiceContext
): Promise<RenameGroupOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    const { group } = await assertAccess(input, ctx);
    return await executeRename(input, group, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Explicitly trace exceptions cleanly downstream logging natively mapping Phase D limits dynamically dropping trace ids carefully
    log.error("[chat:services:rename-group] Unexpected failure", {
      err,
      input: { groupId: input.groupId },
    });
    
    throw err;
  }
};
