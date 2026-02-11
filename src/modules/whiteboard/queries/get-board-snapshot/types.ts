import { z } from "zod";
import { getBoardSnapshotSchema } from "./schema";

export type GetBoardSnapshotInput = z.infer<typeof getBoardSnapshotSchema>;

export type BoardSnapshot = {
  boardId: string;
  snapshot: string;
  lastStreamId: string | null;
  snapshotTimestamp: Date | null;
};
