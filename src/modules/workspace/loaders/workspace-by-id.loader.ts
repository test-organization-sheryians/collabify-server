import DataLoader from "dataloader";
import { db } from "@/infra/db";
import { Workspace } from "@prisma/client";

export const createWorkspaceByIdLoader = () =>
  new DataLoader<string, Workspace | null>(async (ids) => {
    const workspaces = await db.workspace.findMany({
      where: {
        id: { in: [...ids] },
        deletedAt: null,
      },
    });
    const map = new Map(workspaces.map((w) => [w.id, w]));
    return ids.map((id) => map.get(id) || null);
  });
