import { GetMyWorkspacesInput } from "./types";
import { ServiceContext } from "@/graphql/types";

export const getMyWorkspaces = async (
  input: GetMyWorkspacesInput,
  ctx: ServiceContext
) => {
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
