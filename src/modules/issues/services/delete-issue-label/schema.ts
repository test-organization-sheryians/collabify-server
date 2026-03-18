import { z } from "zod";

export const deleteIssueLabelSchema = z.object({
  labelId: z.string().cuid(),
});

export type DeleteIssueLabelInput = z.infer<typeof deleteIssueLabelSchema>;
