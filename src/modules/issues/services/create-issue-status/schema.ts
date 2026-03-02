import { z } from "zod";

export const createIssueStatusSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#6B7280"),
  icon: z.string().max(50).optional(),
});

export type CreateIssueStatusInput = z.infer<typeof createIssueStatusSchema>;
