import { z } from "zod";

export const getBoardCollaboratorsSchema = z.object({
  boardId: z.string().cuid(),
});
