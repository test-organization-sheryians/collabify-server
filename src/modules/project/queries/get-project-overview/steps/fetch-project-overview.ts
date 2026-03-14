/**
 * fetchProjectOverview — single Promise.all with 5 parallel Prisma queries.
 *
 * "Completed" = issues whose status has isSystem=true AND name IN ["Done","Canceled"].
 * "Open"      = all non-deleted issues that are NOT completed.
 * "Overdue"   = open issues whose dueDate < now().
 */
import type { PrismaClient } from "@prisma/client";

export async function fetchProjectOverview(projectId: string, db: PrismaClient) {
  const now = new Date();

  // Completed status names (system statuses that represent terminal states)
  const COMPLETED_STATUS_NAMES = ["Done", "Canceled"];

  const [
    totalIssues,
    completedIssues,
    overdueIssues,
    issueStatuses,
    recentIssues,
    members,
    pageCount,
  ] = await Promise.all([
    // 1. Total non-deleted issues
    db.issue.count({
      where: { projectId, deletedAt: null },
    }),

    // 2. Completed issues (Done / Canceled system statuses)
    db.issue.count({
      where: {
        projectId,
        deletedAt: null,
        status: { isSystem: true, name: { in: COMPLETED_STATUS_NAMES } },
      },
    }),

    // 3. Overdue issues (not completed, dueDate in the past)
    db.issue.count({
      where: {
        projectId,
        deletedAt: null,
        dueDate: { lt: now },
        status: {
          NOT: { isSystem: true, name: { in: COMPLETED_STATUS_NAMES } },
        },
      },
    }),

    // 4. All non-deleted statuses with their issue counts
    db.issueStatus.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        _count: { select: { issues: { where: { deletedAt: null } } } },
      },
      orderBy: { position: "asc" },
    }),

    // 5. Top 5 recently updated issues
    db.issue.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        number: true,
        title: true,
        priority: true,
        dueDate: true,
        updatedAt: true,
        status: { select: { name: true, color: true } },
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),

    // 6. Project members with user profile + project role
    db.projectMember.findMany({
      where: { projectId },
      select: {
        joinedAt: true,
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        projectRole: { select: { name: true, rank: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),

    // 7. Non-deleted page count
    db.page.count({
      where: { projectId, deletedAt: null },
    }),
  ]);

  const openIssues = totalIssues - completedIssues;

  return {
    totalIssues,
    openIssues,
    completedIssues,
    overdueIssues,
    pageCount,
    issuesByStatus: issueStatuses.map((s) => ({
      statusId: s.id,
      name: s.name,
      color: s.color,
      icon: s.icon ?? null,
      issueCount: s._count.issues,
    })),
    recentIssues: recentIssues.map((i) => ({
      id: i.id,
      number: i.number,
      title: i.title,
      priority: i.priority,
      dueDate: i.dueDate?.toISOString() ?? null,
      updatedAt: i.updatedAt.toISOString(),
      statusName: i.status.name,
      statusColor: i.status.color,
      assigneeId: i.assignee?.id ?? null,
      assigneeName: i.assignee?.fullName ?? null,
      assigneeAvatar: i.assignee?.avatarUrl ?? null,
    })),
    members: members.map((m) => ({
      userId: m.user.id,
      name: m.user.fullName ?? m.user.email,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl ?? null,
      roleName: m.projectRole?.name ?? null,
      roleRank: m.projectRole?.rank ?? null,
      joinedAt: m.joinedAt.toISOString(),
    })),
  };
}
