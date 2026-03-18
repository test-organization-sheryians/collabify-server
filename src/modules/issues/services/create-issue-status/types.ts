import type { IssueStatus } from "@prisma/client";

/** What the createIssueStatus handler returns to the resolver. */
export type CreateIssueStatusResult = {
  status: IssueStatus;
};
