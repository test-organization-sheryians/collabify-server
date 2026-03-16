import DataLoader from "dataloader";
import { db } from "@/infra/db";
import type { ProjectMember, User } from "@prisma/client";

export type ProjectMemberWithUser = ProjectMember & { user: User; projectRole?: { name: string } | null };

export const createMembersByProjectIdLoader = () =>
  new DataLoader<string, ProjectMemberWithUser[]>(async (projectIds) => {
    // 1. Fetch all members for the requested project IDs, including user profile and role name
    const members = await db.projectMember.findMany({
      where: {
        projectId: { in: [...projectIds] },
      },
      include: {
        user: true,
        projectRole: { select: { name: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    // 2. Group members by projectId
    const membersMap = new Map<string, ProjectMemberWithUser[]>();

    // Initialize map for all keys to ensure we return empty arrays instead of undefined
    projectIds.forEach((id) => membersMap.set(id, []));

    members.forEach((member) => {
      const existing = membersMap.get(member.projectId) || [];
      existing.push(member);
      membersMap.set(member.projectId, existing);
    });

    // 3. Map back to original IDs order
    return projectIds.map((id) => membersMap.get(id) || []);
  });
