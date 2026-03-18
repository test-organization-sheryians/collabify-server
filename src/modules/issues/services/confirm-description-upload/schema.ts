import { z } from "zod";

export const confirmDescriptionUploadSchema = z.object({
  descriptionFileId: z.string().uuid(),
});

export type ConfirmDescriptionUploadInput = z.infer<
  typeof confirmDescriptionUploadSchema
>;
