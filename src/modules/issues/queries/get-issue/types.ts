import type {
  Issue,
  IssueStatus,
  IssueLabel,
  IssueToLabel,
  User,
} from "@prisma/client";

export type IssueRow = Issue & {
  status: IssueStatus;
  assignee: Pick<User, "id" | "fullName" | "avatarUrl"> | null;
  createdBy: Pick<User, "id" | "fullName" | "avatarUrl">;
  labels: (IssueToLabel & { label: IssueLabel })[];
};
