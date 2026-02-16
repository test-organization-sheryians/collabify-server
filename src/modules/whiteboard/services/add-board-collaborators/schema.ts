import { z } from "zod";

export const addBoardCollaboratorsSchema = z.object({
  boardId: z.string().cuid(),
  userIds: z.array(z.string()).min(1, "At least one user required"),
});
