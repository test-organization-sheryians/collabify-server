import { AppError } from "@/shared/errors";
import { GetWorkspaceBySlugInput } from "./types";
import { ServiceContext } from "@/graphql/types";

export const getWorkspaceBySlug = async (
  input: GetWorkspaceBySlugInput,
  ctx: ServiceContext
) => {
  if (!ctx.auth.userId) throw AppError.unauthorized();
  const { userId, slug } = input;
  const { db } = ctx;

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
};
