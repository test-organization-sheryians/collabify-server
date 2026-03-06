import type { PrismaClient } from "@prisma/client";
import type { FolderRow } from "../types";

interface FetchFoldersInput {
  projectId: string;
  parentFolderId?: string | null;
  sortBy: string;
  sortDir: string;
}

export async function fetchFolders(
  input: FetchFoldersInput,
  db: PrismaClient
): Promise<FolderRow[]> {
  const { projectId, parentFolderId, sortDir } = input;

  return db.vaultFolder.findMany({
    where: {
      projectId,
      parentFolderId: parentFolderId ?? null,
      deletedAt: null,
    },
    orderBy: [
      { isSystem: "asc" }, // system folders always first
      { name: sortDir === "DESC" ? "desc" : "asc" },
    ],
  });
}
