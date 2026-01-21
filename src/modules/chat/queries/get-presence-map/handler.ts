import { ServiceContext } from "@/graphql/types";
import type { GetPresenceMapInput } from "./types";

// TODO: Move to shared types or enum file
enum PresenceStatus {
  ONLINE = "ONLINE",
  AWAY = "AWAY",
  OFFLINE = "OFFLINE",
}

export const handler = (input: GetPresenceMapInput, _ctx: ServiceContext) => {
  // TODO: Implement Redis MGET logic here to fetch presence for all userIds
  // For now, return mock OFFLINE
  return input.userIds.map((userId) => ({
    userId,
    status: PresenceStatus.OFFLINE,
    lastActiveAt: null,
  }));
};
