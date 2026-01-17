import { z } from "zod";

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
  userEmail: z.string().email().toLowerCase(), // Crucial for verification
});
