import { z } from "zod";

export const getBoardSnapshotSchema = z.object({
  boardId: z.string().cuid(),
  clientSnapshot: z.string().optional(), // NEW: Full client Y.Doc for bidirectional sync
});
