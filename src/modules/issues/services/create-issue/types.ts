import type { IssueRow } from "../../queries/get-project-issues/types";

/** What the createIssue handler returns to the resolver. */
export type CreateIssueResult = {
  issue: IssueRow;
};
