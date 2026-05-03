import { z } from "zod";

// Workspace logos must be images only. No documents, no video, no code.
// This is intentionally more restrictive than VAULT_ALLOWED_MIME_TYPES.
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const RequestWorkspaceLogoUploadSchema = z.object({
  workspaceId: z.string().cuid(),
  actorUserId: z.string().min(1),
  mimeType: z.string().refine(
    (val) => ALLOWED_MIME_TYPES.includes(val),
    { message: "Only JPEG, PNG, WebP, or GIF images are allowed." }
  ),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_SIZE_BYTES, { message: "File size cannot exceed 5 MB." }),
});

export type RequestWorkspaceLogoUploadInput = z.infer<typeof RequestWorkspaceLogoUploadSchema>;
