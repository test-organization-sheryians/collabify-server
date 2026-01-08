import { db } from "@/infra/db";
import { AppError } from "@/shared/errors";
import { UserIdSchema, WorkspaceBySlugSchema } from "../types";

export const RetrievalLogic = {
  async getWorkspacesForUser(input: { userId: string }) {
    const { userId } = UserIdSchema.parse(input);
    return db.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getWorkspaceBySlug(input: { userId: string; slug: string }) {
    const { userId, slug } = WorkspaceBySlugSchema.parse(input);

    const workspace = await db.workspace.findFirst({
      where: {
        slug,
        members: {
          some: { userId },
        },
        deletedAt: null,
      },
    });

    if (!workspace) {
      throw AppError.notFound("Workspace not found", "WORKSPACE_NOT_FOUND");
    }

    return workspace;
  },
};
