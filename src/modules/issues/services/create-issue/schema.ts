import { z } from "zod";
import { IssuePriority } from "@prisma/client";

export const createIssueSchema = z.object({
  projectId: z.string().cuid(),
  statusId: z.string().cuid(),
  title: z.string().min(1).max(255),
  priority: z.nativeEnum(IssuePriority).default("NO_PRIORITY"),
  assigneeId: z.string().nullish(),
  labelIds: z.array(z.string().cuid()).default([]),
  dueDate: z.string().datetime({ offset: true }).nullish(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
