import { z } from "zod";

export const updatePageDetailsSchema = z.object({
  pageId: z.string().cuid(),
  /**
   * undefined = skip (do not update)
   * null      = clear the emoji
   * string    = set new emoji
   */
  emoji: z.string().max(10).nullable().optional(),
  /**
   * undefined = skip (do not update)
   * null      = remove cover image
   * string    = permanent vault proxy URL (/vault/file/{fileId})
   */
  coverImageUrl: z.string().nullable().optional(),
});

export type UpdatePageDetailsInput = z.infer<typeof updatePageDetailsSchema>;
