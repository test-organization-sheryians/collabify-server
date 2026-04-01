import { createLogger } from "@/shared/lib/logger";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { CreateChannelInput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { create } from "./steps/create";

const log = createLogger("chat:services:create-channel");

/**
 * createChannel Handler
 *
 * Steps:
 *  1. assertAccess — evaluates pre-flight explicit hierarchy queries for workspace access
 *  2. create       — runs LockingService dependencies and creates $transaction arrays.
 */
export const handler = async (
  input: CreateChannelInput,
  ctx: ServiceContext
) => {
  try {
    if (!ctx.auth?.userId) throw AppError.unauthorized();

    await assertAccess(input, ctx);
    return await create(input, ctx);
  } catch (err) {
    if (err instanceof AppError) throw err;
    log.error("[create-channel] Unexpected failure", { err, ...input });
    throw new AppError("Failed to create channel");
  }
};
