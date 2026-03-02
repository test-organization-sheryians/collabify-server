import type { IssueLabel } from "@prisma/client";

/** What the createIssueLabel handler returns to the resolver. */
export type CreateIssueLabelResult = {
  label: IssueLabel;
};
