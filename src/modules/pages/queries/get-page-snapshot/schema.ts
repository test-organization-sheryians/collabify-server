import { z } from "zod";

/**
 * getPageSnapshot — Input schema.
 *
 * pageId       — required. The page the client is opening.
 * clientSnapshot — optional. Client's current Y.Doc state as base64.
 *   Provided ONLY on reconnect when the client has offline edits to upload.
 *   First open: omit this field (no local state yet).
 *   Reconnect:  send Y.encodeStateAsUpdate(localDoc) as base64.
 */
export const getPageSnapshotSchema = z.object({
  pageId: z.string().cuid(),
});

export type GetPageSnapshotInput = z.infer<typeof getPageSnapshotSchema>;
