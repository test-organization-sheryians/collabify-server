import type { IssueStatus } from "@prisma/client";

/** What the updateIssueStatus handler returns to the resolver. */
export type UpdateIssueStatusResult = {
  status: IssueStatus;
};
