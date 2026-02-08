import { z } from "zod";

export const getBoardSchema = z.object({
  id: z.string().cuid(),
});
