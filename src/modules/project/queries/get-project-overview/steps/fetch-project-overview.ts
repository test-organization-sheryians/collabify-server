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
  // Pin to UTC midnight of today so issues due "today" are always included
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

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
    issuesByPriority,
    upcomingIssues,
    recentPages,
    recentVaultFiles,
    recentWhiteboards,
    vaultUsage,
    projectChannels,
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

    // 8. Issues by priority (open issues only)
    db.issue.groupBy({
      by: ["priority"],
      where: {
        projectId,
        deletedAt: null,
        status: { NOT: { isSystem: true, name: { in: COMPLETED_STATUS_NAMES } } },
      },
      _count: { _all: true },
    }),

    // 9. Upcoming issues (dueDate in future, sorted ASC, take 5)
    db.issue.findMany({
      where: {
        projectId,
        deletedAt: null,
        dueDate: { gte: startOfToday },
        status: { NOT: { isSystem: true, name: { in: COMPLETED_STATUS_NAMES } } },
      },
      select: {
        id: true,
        number: true,
        title: true,
        dueDate: true,
        status: { select: { name: true, color: true } },
        assignee: { select: { fullName: true, avatarUrl: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),

    // 10. Recent pages (take 5)
    db.page.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        title: true,
        emojiIcon: true,
        updatedAt: true,
        creator: { select: { fullName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),

    // 11. Recent vault files (take 5)
    db.vaultFile.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        uploader: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // 12. Recent whiteboards (take 3)
    db.whiteboard.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        title: true,
        elementCount: true,
        updatedAt: true,
        isLocked: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),

    // 13. Vault project usage
    db.vaultProjectUsage.findFirst({
      where: { projectId },
      select: { usedBytes: true, fileCount: true },
    }),

    // 14. Project chat channels
    db.chatConversation.findMany({
      where: { projectId, type: "CHANNEL", deletedAt: null },
      select: { id: true, name: true, topic: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const openIssues = totalIssues - completedIssues;

  return {
    totalIssues,
    openIssues,
    completedIssues,
    overdueIssues,
    pageCount,
    memberCount: members.length,
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

    issuesByPriority: issuesByPriority.map((p) => ({
      priority: p.priority,
      count: p._count._all,
    })),
    upcomingIssues: upcomingIssues.map((i) => ({
      id: i.id,
      number: i.number,
      title: i.title,
      dueDate: i.dueDate!.toISOString(),   // always set: query filters dueDate gte now
      assigneeName: i.assignee?.fullName ?? null,
      assigneeAvatar: i.assignee?.avatarUrl ?? null,
      statusName: i.status.name,
      statusColor: i.status.color,
    })),
    recentPages: recentPages.map((p) => ({
      id: p.id,
      title: p.title,
      emojiIcon: p.emojiIcon ?? null,
      updatedAt: p.updatedAt.toISOString(),
      createdByName: p.creator.fullName ?? null,
    })),
    recentVaultFiles: recentVaultFiles.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      sizeBytes: Number(f.sizeBytes),
      createdByName: f.uploader?.fullName ?? null,
      createdAt: f.createdAt.toISOString(),
    })),
    recentWhiteboards: recentWhiteboards.map((w) => ({
      id: w.id,
      title: w.title,
      elementCount: w.elementCount,
      updatedAt: w.updatedAt.toISOString(),
      isLocked: w.isLocked,
    })),
    vaultUsage: {
      usedBytes: Number(vaultUsage?.usedBytes ?? 0),
      fileCount: vaultUsage?.fileCount ?? 0,
    },
    projectChannels: projectChannels.map((c) => ({
      id: c.id,
      name: c.name ?? "Untitled Channel",
      topic: c.topic ?? null,
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}
