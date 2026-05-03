import { z } from "zod";

// Project logos must be images only.
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const RequestProjectLogoUploadSchema = z.object({
  projectId: z.string().cuid(),
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

export type RequestProjectLogoUploadInput = z.infer<typeof RequestProjectLogoUploadSchema>;
