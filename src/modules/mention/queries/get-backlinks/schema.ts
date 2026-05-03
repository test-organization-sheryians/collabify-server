import { z } from "zod";

export const BacklinkFiltersSchema = z.object({
  sourceType: z.string().optional(),
  actorId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type BacklinkFilters = z.infer<typeof BacklinkFiltersSchema>;

export const GetBacklinksSchema = z.object({
  targetEntityId: z.string().cuid(),
  limit: z.number().min(1).max(100).optional().default(50),
  cursor: z.string().optional(),
  filters: BacklinkFiltersSchema.optional(),
});

export type GetBacklinksInput = z.infer<typeof GetBacklinksSchema>;
