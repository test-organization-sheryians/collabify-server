import { z } from "zod";

export const updateIssueStatusSchema = z.object({
  statusId: z.string().cuid(),
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).nullable().optional(),
});

export type UpdateIssueStatusInput = z.infer<typeof updateIssueStatusSchema>;
