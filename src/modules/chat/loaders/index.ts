import { createChannelByIdLoader } from "./channel-by-id.loader";
import { createMembersByChannelIdLoader } from "./members-by-channel-id.loader";
import { createMemberCountByChannelIdLoader } from "./member-count-by-channel-id.loader";
import { createLastMessageByChannelIdLoader } from "./last-message-by-channel-id.loader";
import { createUserByIdLoader } from "./user-by-id.loader";
import { createReplyCountByMessageIdLoader } from "./reply-count-by-message-id.loader";
import type { ApplicationContext } from "@/graphql/types";

/**
 * Create all chat module dataloaders
 * Called per-request to ensure fresh batching context
 */
export const createChatLoaders = (ctx: ApplicationContext) => ({
  channelById: createChannelByIdLoader(),
  membersByChannelId: createMembersByChannelIdLoader(),
  memberCountByChannelId: createMemberCountByChannelIdLoader(),
  lastMessageByChannelId: createLastMessageByChannelIdLoader(),
  userById: createUserByIdLoader(ctx),
  replyCountByMessageId: createReplyCountByMessageIdLoader(ctx),
});

export type ChatLoaders = ReturnType<typeof createChatLoaders>;
