import { z } from "zod";

export const getActiveCollaboratorsSchema = z.object({
  boardId: z.string().cuid(),
});
