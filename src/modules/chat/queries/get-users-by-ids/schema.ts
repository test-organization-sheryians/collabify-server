import { z } from "zod";

export const getUsersByIdsSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100), // Limit to 100 users per batch
});
