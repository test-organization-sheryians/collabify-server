import { z } from "zod";

export const GetInviteInfoSchema = z.object({
  token: z.string().min(1),
  userId: z.string().optional(), // Can be anonymous
  userEmail: z.string().email().optional(), // For checking match
});
