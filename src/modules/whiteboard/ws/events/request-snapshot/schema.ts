import { z } from "zod";

export const requestSnapshotSchema = z.object({
  boardId: z.string().min(1),
  fromStreamId: z.string().optional(), // Client's last known stream ID
});

export type RequestSnapshotInput = z.infer<typeof requestSnapshotSchema>;
