/**
 * Issues — GraphQL Mappers
 *
 * Prisma model → GraphQL type converters.
 * No business logic — pure shape transformation.
 *
 * Exported `GraphQL*` types are used in codegen.ts mappers so that the
 * generated `Resolvers` type accepts what these functions return directly,
 * eliminating `as any` in resolvers.ts.
 */

import type { IssueStatus, IssueLabel, User } from "@prisma/client";
import type { IssueRow } from "../queries/get-project-issues/types";

// ── IssueStatus ───────────────────────────────────────────────────────────────

export type GraphQLIssueStatus = ReturnType<typeof toGraphQLStatus>;

export function toGraphQLStatus(
  status: IssueStatus & { _count?: { issues: number } }
) {
  return {
    id: status.id,
    projectId: status.projectId,
    name: status.name,
    color: status.color,
    icon: status.icon ?? null,
    position: status.position,
    isSystem: status.isSystem,
    issueCount: status._count?.issues ?? 0,
    createdAt: status.createdAt,
    updatedAt: status.updatedAt,
  };
}

// ── IssueLabel ────────────────────────────────────────────────────────────────

export type GraphQLIssueLabel = ReturnType<typeof toGraphQLLabel>;

export function toGraphQLLabel(label: IssueLabel) {
  return {
    id: label.id,
    projectId: label.projectId,
    name: label.name,
    color: label.color,
    createdAt: label.createdAt,
  };
}

// ── IssueUser ─────────────────────────────────────────────────────────────────

function toGraphQLUser(
  user: Pick<User, "id" | "fullName" | "avatarUrl"> | null
) {
  if (!user) return null;
  return {
    id: user.id,
    fullName: user.fullName ?? null,
    avatarUrl: user.avatarUrl ?? null,
  };
}

// ── Issue ─────────────────────────────────────────────────────────────────────

export type GraphQLIssue = ReturnType<typeof toGraphQLIssue>;

export function toGraphQLIssue(issue: IssueRow) {
  return {
    id: issue.id,
    projectId: issue.projectId,
    workspaceId: issue.workspaceId,
    number: issue.number,
    title: issue.title,
    descriptionS3Key: issue.descriptionS3Key ?? null,
    status: toGraphQLStatus(issue.status),
    priority: issue.priority,
    position: issue.position,
    assignee: toGraphQLUser(issue.assignee),
    labels: issue.labels.map((l) => toGraphQLLabel(l.label)),
    dueDate: issue.dueDate ?? null,
    createdBy: toGraphQLUser(issue.createdBy)!,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}
