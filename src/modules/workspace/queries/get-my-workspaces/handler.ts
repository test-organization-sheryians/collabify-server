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

  return db.workspace.findMany({
    where: {
      members: {
        some: { userId },
      },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
};
