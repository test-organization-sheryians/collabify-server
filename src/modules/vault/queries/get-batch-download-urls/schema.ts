import { z } from "zod";

const MAX_BATCH_SIZE = 50;

export const getBatchDownloadUrlsSchema = z.object({
  fileIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_BATCH_SIZE, `Maximum ${MAX_BATCH_SIZE} fileIds per batch`),
});

export type GetBatchDownloadUrlsInput = z.infer<typeof getBatchDownloadUrlsSchema>;
