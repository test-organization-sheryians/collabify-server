import { z } from "zod";

export const updateIssueLabelSchema = z.object({
  labelId: z.string().cuid(),
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export type UpdateIssueLabelInput = z.infer<typeof updateIssueLabelSchema>;
