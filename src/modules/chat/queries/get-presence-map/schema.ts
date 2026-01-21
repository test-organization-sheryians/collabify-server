import { z } from "zod";

export const getPresenceMapSchema = z.object({
  userIds: z.array(z.string().cuid()),
});
