import { RouteMap } from "@/infra/ws/types";
import { subscribeChannel } from "./events/subscribe-channel";
import { unsubscribeChannel } from "./events/unsubscribe-channel";
import { subscribeThread } from "./events/subscribe-thread";
import { unsubscribeThread } from "./events/unsubscribe-thread";
import { sendMessage } from "./events/send-message";
import { editMessage } from "./events/edit-message";
import { deleteMessage } from "./events/delete-message";
import { userTyping } from "./events/user-typing";
import { userStopTyping } from "./events/user-stop-typing";
import { markRead } from "./events/mark-read";

export const chatWSRoutes: RouteMap = {
  // Subscription Cycle
  "chat:subscribe-channel": subscribeChannel,
  "chat:unsubscribe-channel": unsubscribeChannel,
  "chat:subscribe-thread": subscribeThread,
  "chat:unsubscribe-thread": unsubscribeThread,

  // Message Actions
  "chat:send-message": sendMessage,
  "chat:edit-message": editMessage,
  "chat:delete-message": deleteMessage,

  // Ephemeral State
  "chat:user-typing": userTyping,
  "chat:user-stop-typing": userStopTyping,
  "chat:mark-read": markRead,
};
