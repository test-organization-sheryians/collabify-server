/**
 * Issues — GraphQL Type Definitions Aggregator
 *
 * Collects shared Issue types + extends Query and Mutation with all operations.
 * Imported by module root index.ts and merged into the server schema.
 */

import * as getIssueStatuses from "../queries/get-issue-statuses";
import * as getProjectIssues from "../queries/get-project-issues";
import * as getIssue from "../queries/get-issue";
import * as getIssueLabels from "../queries/get-issue-labels";
import * as getIssueDescriptionUrl from "../queries/get-issue-description-url";

import * as createIssue from "../services/create-issue";
import * as updateIssue from "../services/update-issue";
import * as deleteIssue from "../services/delete-issue";
import * as moveIssueStatus from "../services/move-issue-status";
import * as reorderIssue from "../services/reorder-issue";
import * as createIssueStatus from "../services/create-issue-status";
import * as updateIssueStatus from "../services/update-issue-status";
import * as reorderIssueStatus from "../services/reorder-issue-status";
import * as deleteIssueStatus from "../services/delete-issue-status";
import * as createIssueLabel from "../services/create-issue-label";
import * as updateIssueLabel from "../services/update-issue-label";
import * as deleteIssueLabel from "../services/delete-issue-label";
import * as requestDescriptionUpload from "../services/request-description-upload";
import * as confirmDescriptionUpload from "../services/confirm-description-upload";

export const issuesTypeDefs = [
  // Queries
  getIssueStatuses.typeDefs,
  getProjectIssues.typeDefs,
  getIssue.typeDefs,
  getIssueLabels.typeDefs,
  getIssueDescriptionUrl.typeDefs,
  // Services
  createIssue.typeDefs,
  updateIssue.typeDefs,
  deleteIssue.typeDefs,
  moveIssueStatus.typeDefs,
  reorderIssue.typeDefs,
  createIssueStatus.typeDefs,
  updateIssueStatus.typeDefs,
  reorderIssueStatus.typeDefs,
  deleteIssueStatus.typeDefs,
  createIssueLabel.typeDefs,
  updateIssueLabel.typeDefs,
  deleteIssueLabel.typeDefs,
  requestDescriptionUpload.typeDefs,
  confirmDescriptionUpload.typeDefs,
];
