/**
 * setConversationNotifMode — Service Handler
 *
 * Handles per-conversation notification modes and temporary mutes.
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/infra/db";
import type { SetConversationNotifModeInput } from "./types";
import type { ServiceContext } from "@/graphql/types";
import * as prefWriter from "@/modules/notification/shared/preferences/preference-writer";
import * as prefCache from "@/modules/notification/shared/preferences/preference-cache";

const log = createLogger("chat:services:set-conversation-notif-mode");

export const handler = async (
  input: SetConversationNotifModeInput,
  _ctx: ServiceContext
) => {
  const { userId, conversationId, mode, muteUntil } = input;

  // Verify membership
  const member = await db.chatMember.findUnique({
    where: { conversationId_userId: { userId, conversationId } },
  });
  if (!member) throw AppError.forbidden("User is not a member of this conversation");

  await prefWriter.updateConversation(userId, conversationId, {
    mode,
    muteUntil: muteUntil ? new Date(muteUntil) : muteUntil === null ? null : undefined,
  });

  const fresh = await prefCache.getConversation(userId, conversationId);
  if (!fresh) throw new Error("Failed to load conversation preferences after update");

  log.debug("Conversation notif mode updated", { userId, conversationId });

  return {
    conversationId: conversationId,
    mode:           fresh.mode as unknown as import("@/graphql/generated").ConversationNotifMode,
    muteUntil:      fresh.muteUntil ? new Date(fresh.muteUntil) : null,
    pushEnabled:    fresh.pushEnabled,
    emailEnabled:   fresh.emailEnabled,
  };
};
