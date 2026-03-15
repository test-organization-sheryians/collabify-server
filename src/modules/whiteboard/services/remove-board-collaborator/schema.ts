import { z } from "zod";

export const removeBoardCollaboratorSchema = z.object({
  boardId: z.string().cuid(),
  userId: z.string().min(1),

});
