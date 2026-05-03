import { GetMyWorkspacesInput } from "./types";
import { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

export const getMyWorkspaces = async (
  input: GetMyWorkspacesInput,
  ctx: ServiceContext
) => {
  if (!ctx.auth.userId) throw AppError.unauthorized();
  const { userId } = input;
  const { db } = ctx;

  const memberships = await db.workspaceMember.findMany({
    where: {
      userId,
      workspace: { deletedAt: null },
    },
    include: {
      workspace: true,
      assignedRole: true,
    },
    orderBy: { workspace: { createdAt: "desc" } },
  });

  return memberships.map((m) => ({
    ...m.workspace,
    memberRole: m.assignedRole?.name ?? null,
  }));
};

