import { z } from "zod";

export const confirmDescriptionUploadSchema = z.object({
  descriptionFileId: z.string().cuid(),
});

export type ConfirmDescriptionUploadInput = z.infer<
  typeof confirmDescriptionUploadSchema
>;
