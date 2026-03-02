import type { IssueStatus } from "@prisma/client";

/** What the reorderIssueStatus handler returns to the resolver. */
export type ReorderIssueStatusResult = {
  status: IssueStatus;
};
