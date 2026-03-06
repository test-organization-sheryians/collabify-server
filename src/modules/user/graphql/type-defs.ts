import {
  typeDefs as syncUserTypeDefs,
  updateProfileTypeDefs,
  deleteAccountTypeDefs,
} from "../services";
import {
  typeDefs as getMeTypeDefs,
  getPublicUserTypeDefs,
  getWorkspaceUserTypeDefs,
} from "../queries";

export const typeDefs = [
  syncUserTypeDefs,
  updateProfileTypeDefs,
  deleteAccountTypeDefs,
  getMeTypeDefs,
  getPublicUserTypeDefs,
  getWorkspaceUserTypeDefs,
];
