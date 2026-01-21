import { createChannelByIdLoader } from "./channel-by-id.loader";
import { createLastMessageByChannelIdLoader } from "./last-message-by-channel-id.loader";
import { createMemberCountByChannelIdLoader } from "./member-count-by-channel-id.loader";
import { createMembersByChannelIdLoader } from "./members-by-channel-id.loader";

export const createChatLoaders = () => ({
  channelById: createChannelByIdLoader(),
  lastMessageByChannelId: createLastMessageByChannelIdLoader(),
  memberCountByChannelId: createMemberCountByChannelIdLoader(),
  membersByChannelId: createMembersByChannelIdLoader(),
});

export type ChatLoaders = ReturnType<typeof createChatLoaders>;
