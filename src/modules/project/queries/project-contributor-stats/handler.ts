import { PrismaClient } from "@prisma/client";

export async function projectContributorStatsHandler(
  projectId: string,
  db: PrismaClient
) {
  const COMPLETED_STATUS_NAMES = ["Done", "Canceled"];

  // 1. Get all project members with user profile
  const members = await db.projectMember.findMany({
    where: { projectId },
    select: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  // 2. Group open issues by assignee
  const openIssuesCounts = await db.issue.groupBy({
    by: ["assigneeId"],
    where: {
      projectId,
      deletedAt: null,
      assigneeId: { not: null },
      status: { NOT: { isSystem: true, name: { in: COMPLETED_STATUS_NAMES } } },
    },
    _count: { _all: true },
  });

  // 3. Group completed issues by assignee
  const completedIssuesCounts = await db.issue.groupBy({
    by: ["assigneeId"],
    where: {
      projectId,
      deletedAt: null,
      assigneeId: { not: null },
      status: { isSystem: true, name: { in: COMPLETED_STATUS_NAMES } },
    },
    _count: { _all: true },
  });

  // 4. Merge results
  const stats = members.map((m) => {
    const openCount = openIssuesCounts.find((c) => c.assigneeId === m.user.id)?._count._all ?? 0;
    const completedCount = completedIssuesCounts.find((c) => c.assigneeId === m.user.id)?._count._all ?? 0;

    return {
      userId: m.user.id,
      name: m.user.fullName ?? "Unknown",
      avatarUrl: m.user.avatarUrl ?? null,
      assigned: openCount,
      completed: completedCount,
    };
  });

  // 5. Final sort: most active first
  return stats.sort((a, b) => (b.assigned + b.completed) - (a.assigned + a.completed)).slice(0, 5);
}
