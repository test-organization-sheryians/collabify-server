import { z } from "zod";

export const getUserChannelsSchema = z.object({
  userId: z.string().cuid(),
});
