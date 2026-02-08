import { z } from "zod";
import { getBoardSnapshotSchema } from "./schema";

export type GetBoardSnapshotInput = z.infer<typeof getBoardSnapshotSchema>;

export type BoardSnapshot = {
  boardId: string;
  snapshot: string; // Base64-encoded Y.Doc state
  lastStreamId: string | null;
  snapshotTimestamp: Date | null;
};
