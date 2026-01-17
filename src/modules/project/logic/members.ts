import { db } from "@/infra/db";
import { ProjectMember } from "@prisma/client";

export const membersLogic = {
  getProjectMembers: async (projectId: string): Promise<ProjectMember[]> => {
    return db.projectMember.findMany({
      where: {
        projectId,
        // deletedAt: null // ProjectMember doesn't have deletedAt in schema, relying on cascading delete from Project/User or direct removal
      },
      include: {
        user: true, // Often needed, but we can rely on field resolvers if we return just the member object
      },
    });
  },
};
