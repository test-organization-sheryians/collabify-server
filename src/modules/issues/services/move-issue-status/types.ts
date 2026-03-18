import type { IssueRow } from "../../queries/get-project-issues/types";

/** What the moveIssueStatus handler returns to the resolver. */
export type MoveIssueStatusResult = {
  issue: IssueRow;
};
