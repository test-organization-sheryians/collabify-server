import { z } from "zod";
import { IssuePriority } from "@prisma/client";

export const getProjectIssuesSchema = z.object({
  projectId: z.string().cuid(),
  assigneeId: z.string().cuid().optional(),
  labelIds: z.array(z.string().cuid()).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
});

export type GetProjectIssuesInput = z.infer<typeof getProjectIssuesSchema>;
