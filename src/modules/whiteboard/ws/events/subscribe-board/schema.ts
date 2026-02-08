import { z } from "zod";

export const subscribeBoardSchema = z.object({
  boardId: z.string().min(1),
  stateVector: z.string().optional(), // Client's Y.Doc state vector for computing diff
});

export type SubscribeBoardInput = z.infer<typeof subscribeBoardSchema>;
