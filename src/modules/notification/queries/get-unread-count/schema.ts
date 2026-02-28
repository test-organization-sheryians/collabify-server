import { z } from "zod";

export const GetUnreadCountSchema = z.object({
  userId: z.string().uuid(),
});
