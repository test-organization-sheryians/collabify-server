import { z } from "zod";

export const requestDescriptionUploadSchema = z.object({
  issueId: z.string().cuid(),
  sizeBytes: z.number().int().positive(),
});

export type RequestDescriptionUploadInput = z.infer<
  typeof requestDescriptionUploadSchema
>;
