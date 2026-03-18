import type { IssueRow } from "../../queries/get-project-issues/types";

/** What the confirmDescriptionUpload handler returns to the resolver. */
export type ConfirmDescriptionUploadResult = {
  issue: IssueRow;
};
