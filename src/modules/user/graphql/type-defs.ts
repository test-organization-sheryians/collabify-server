import {
  typeDefs as syncUserTypeDefs,
  updateProfileTypeDefs,
  deleteAccountTypeDefs,
  updateGlobalNotifPrefsTypeDefs,
  declineWorkspaceInviteTypeDefs,
} from "../services";
import {
  typeDefs as getMeTypeDefs,
  getPublicUserTypeDefs,
  getWorkspaceUserTypeDefs,
  getUserHomeTypeDefs,
  getNotificationSummaryTypeDefs,
} from "../queries";

export const typeDefs = [
  syncUserTypeDefs,
  updateProfileTypeDefs,
  deleteAccountTypeDefs,
  updateGlobalNotifPrefsTypeDefs,
  declineWorkspaceInviteTypeDefs,
  getMeTypeDefs,
  getPublicUserTypeDefs,
  getWorkspaceUserTypeDefs,
  getUserHomeTypeDefs,
  getNotificationSummaryTypeDefs,
];
