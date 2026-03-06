import type { IssueRow } from "../../queries/get-project-issues/types";

/** What the updateIssue handler returns to the resolver. */
export type UpdateIssueResult = {
  issue: IssueRow;
};
