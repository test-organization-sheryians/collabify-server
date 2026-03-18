import { z } from "zod";

export const createIssueLabelSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#6B7280"),
});

export type CreateIssueLabelInput = z.infer<typeof createIssueLabelSchema>;
