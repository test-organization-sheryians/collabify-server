import { z } from "zod";

export const getBoardSnapshotSchema = z.object({
  boardId: z.string().cuid(),
});
