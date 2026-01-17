import { z } from "zod";

export const GetMyWorkspacesSchema = z.object({
  userId: z.string().min(1),
});
