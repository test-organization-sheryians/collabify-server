import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";

import type { MuteConversationInput, MuteConversationOutput } from "./types";
import { assertAccess } from "./steps/assert-access";
import { executeMute } from "./steps/execute-mute";

const log = createLogger("chat:services:mute-conversation");

/**
 * Mute Conversation Handler
 *
 * Universal service - works for all conversation types.
 * Updates the ChatMember.isMuted field for the current user.
 */
export const handler = async (
  input: MuteConversationInput,
  ctx: ServiceContext
): Promise<MuteConversationOutput> => {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("User not authenticated");
  }

  try {
    await assertAccess(input, ctx);
    return await executeMute(input, ctx);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    
    // Log unexpected operational drops tracking failures upstream securely mapping.
    log.error("[chat:services:mute-conversation] Unexpected failure", {
      err,
      input: { conversationId: input.conversationId },
    });
    
    throw err;
  }
};
