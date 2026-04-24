/**
 * fetchWorkspaceOverview — single Promise.all with 8 parallel Prisma queries.
 *
 * "Completed" = issues whose status isSystem=true AND name IN ["Done","Canceled"].
 * "Open"      = all non-deleted issues that are NOT completed.
 * Channels    = ChatConversation with type=CHANNEL and projectId=null (workspace-level channels).
 */
import type { PrismaClient } from "@prisma/client";
import { generatePresignedGet } from "@/modules/vault/lib/s3-keys";
import { VAULT_S3 } from "@/modules/vault/lib/constants";

const COMPLETED_STATUS_NAMES = ["Done", "Canceled"];

export async function fetchWorkspaceOverview(workspaceId: string, db: PrismaClient) {
  const [
    totalProjects,
    totalMembers,
    totalIssues,
    totalPages,
    totalChannels,
    activeProjects,
    recentMembers,
    urgentIssues,
  ] = await Promise.all([
    // 1. Active project count
    db.project.count({
      where: { workspaceId, isArchived: false, deletedAt: null },
    }),

    // 2. Total workspace member count
    db.workspaceMember.count({
      where: { workspaceId },
    }),

    // 3. Total non-deleted issue count
    db.issue.count({
      where: { workspaceId, deletedAt: null },
    }),

    // 4. Total non-deleted page count
    db.page.count({
      where: { workspaceId, deletedAt: null },
    }),

    // 5. Workspace-level channels (projectId null = not a project chat)
    db.chatConversation.count({
      where: {
        workspaceId,
        type: "CHANNEL",
        projectId: null,
        deletedAt: null,
      },
    }),

    // 6. Top 5 recently updated active projects with member + open issue counts
    db.project.findMany({
      where: { workspaceId, isArchived: false, deletedAt: null },
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        logoS3Key: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            issues: {
              where: {
                deletedAt: null,
                status: {
                  NOT: { isSystem: true, name: { in: COMPLETED_STATUS_NAMES } },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),

    // 7. Last 5 members to join — with user info + workspace role name
    db.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        joinedAt: true,
        assignedRole: { select: { name: true } },
        user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: "desc" },
      take: 5,
    }),

    // 8. Top 5 URGENT open issues across all workspace projects
    db.issue.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        priority: "URGENT",
        status: {
          NOT: { isSystem: true, name: { in: COMPLETED_STATUS_NAMES } },
        },
      },
      select: {
        id: true,
        number: true,
        title: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: { id: true, fullName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalProjects,
    totalMembers,
    totalIssues,
    totalPages,
    totalChannels,
    activeProjects: await Promise.all(
      activeProjects.map(async (p) => ({
        id: p.id,
        name: p.name,
        key: p.key,
        description: p.description ?? null,
        logoUrl: p.logoS3Key
          ? await generatePresignedGet(p.logoS3Key, VAULT_S3.PRESIGNED_GET_TTL_SECONDS)
          : null,
        memberCount: p._count.members,
        openIssues: p._count.issues,
        updatedAt: p.updatedAt.toISOString(),
      }))
    ),
    recentMembers: recentMembers.map((m) => ({
      userId: m.user.id,
      fullName: m.user.fullName ?? null,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl ?? null,
      roleName: m.assignedRole.name,
      joinedAt: m.joinedAt.toISOString(),
    })),
    urgentIssues: urgentIssues.map((i) => ({
      id: i.id,
      number: i.number,
      title: i.title,
      priority: i.priority,
      projectId: i.project.id,
      projectName: i.project.name,
      projectKey: i.project.key,
      assigneeId: i.assignee?.id ?? null,
      assigneeName: i.assignee?.fullName ?? null,
      dueDate: i.dueDate?.toISOString() ?? null,
    })),
  };
}
