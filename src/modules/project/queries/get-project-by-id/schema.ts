import { z } from "zod";

export const GetProjectByIdSchema = z.object({
  id: z.string().cuid("Invalid Project ID"),
});
