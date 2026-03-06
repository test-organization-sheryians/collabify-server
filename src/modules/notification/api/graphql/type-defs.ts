import { getNotificationsTypeDefs } from "../../queries/get-notifications";
import { getUnreadCountTypeDefs } from "../../queries/get-unread-count";
import { markNotificationReadTypeDefs } from "../../services/mark-notification-read";
import { markAllNotificationsReadTypeDefs } from "../../services/mark-all-notifications-read";

export const typeDefs = [
  getNotificationsTypeDefs,
  getUnreadCountTypeDefs,
  markNotificationReadTypeDefs,
  markAllNotificationsReadTypeDefs,
].join("\n");
