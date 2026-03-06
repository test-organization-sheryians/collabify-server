import { z } from "zod";

export const GetPublicUserSchema = z.object({
  userId: z.string(),
});

export type GetPublicUserInput = z.infer<typeof GetPublicUserSchema>;
