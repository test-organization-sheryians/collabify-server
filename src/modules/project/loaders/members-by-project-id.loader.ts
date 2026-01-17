import DataLoader from "dataloader";
import { db } from "@/infra/db";
import { ProjectMember } from "@prisma/client";

export const createMembersByProjectIdLoader = () =>
  new DataLoader<string, ProjectMember[]>(async (projectIds) => {
    // 1. Fetch all members for the requested project IDs
    const members = await db.projectMember.findMany({
      where: {
        projectId: { in: [...projectIds] },
      },
      orderBy: { joinedAt: "asc" },
    });

    // 2. Group members by projectId
    const membersMap = new Map<string, ProjectMember[]>();

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
