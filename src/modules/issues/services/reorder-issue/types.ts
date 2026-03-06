import type { IssueRow } from "../../queries/get-project-issues/types";

/** What the reorderIssue handler returns to the resolver. */
export type ReorderIssueResult = {
  issue: IssueRow;
};
