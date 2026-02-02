import { z } from "zod";

export const deleteDmSchema = z.object({
  workspaceId: z.string().cuid(),
  dmId: z.string().cuid(),
});
