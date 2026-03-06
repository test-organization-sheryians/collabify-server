import { z } from "zod";
import { IssuePriority } from "@prisma/client";

export const updateIssueSchema = z.object({
  issueId: z.string().cuid(),
  title: z.string().min(1).max(255).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  labelIds: z.array(z.string().cuid()).optional(),
  dueDate: z.string().datetime({ offset: true }).nullish(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
