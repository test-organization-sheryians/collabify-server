import { z } from "zod";

export const getPageSnapshotSchema = z.object({
  pageId: z.string().cuid(),
  /**
   * The client's current full Y.Doc state, encoded as base64 Y.encodeStateAsUpdate().
   * Optional: provided when client has local edits made while offline/disconnected.
   * Server merges this into the authoritative snapshot and adds the delta to the stream.
   */
  clientSnapshot: z.string().optional(),
});

export type GetPageSnapshotInput = z.infer<typeof getPageSnapshotSchema>;
export { typeDefs } from "./type-defs";
export { getPageSnapshotHandler as handler } from "./handler";
export { getPageSnapshotSchema as schema };
