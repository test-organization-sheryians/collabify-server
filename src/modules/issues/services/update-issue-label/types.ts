import type { IssueLabel } from "@prisma/client";

/** What the updateIssueLabel handler returns to the resolver. */
export type UpdateIssueLabelResult = {
  label: IssueLabel;
};
