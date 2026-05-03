import { z } from "zod";

export const registerExternalFileSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
  source: z.enum(["CHAT", "PAGE", "WHITEBOARD", "TASK"]),
  sourceId: z.string().optional(),
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  /** Float — JS-safe; server converts to BigInt internally */
  sizeBytes: z.number().int().positive(),
  folderId: z.string().optional(),
});

export type RegisterExternalFileInput = z.infer<typeof registerExternalFileSchema>;
