import type { PrismaClient, Prisma } from "@prisma/client";
import type { FileRow } from "../types";

interface FetchFilesInput {
  projectId: string;
  parentFolderId?: string | null;
  cursor?: string;
  limit: number;
  sortBy: string;
  sortDir: string;
}

type OrderBy = Prisma.VaultFileOrderByWithRelationInput;

function buildOrderBy(sortBy: string, sortDir: string): OrderBy {
  const dir = sortDir === "DESC" ? "desc" : "asc";
  switch (sortBy) {
    case "CREATED_AT":
      return { createdAt: dir };
    case "SIZE":
      return { sizeBytes: dir };
    case "TYPE":
      return { mimeType: dir };
    default:
      return { name: dir }; // NAME
  }
}

/**
 * Cursor-paginated file fetch.
 * Fetches limit+1 rows to determine hasNextPage without a separate COUNT query.
 */
export async function fetchFiles(
  input: FetchFilesInput,
  db: PrismaClient
): Promise<{
  files: FileRow[];
  hasNextPage: boolean;
  nextCursor: string | null;
}> {
  const { projectId, parentFolderId, cursor, limit, sortBy, sortDir } = input;

  const rows = await db.vaultFile.findMany({
    where: {
      projectId,
      folderId: parentFolderId ?? null,
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      uploader: { select: { id: true, fullName: true, avatarUrl: true } },
    },
    orderBy: buildOrderBy(sortBy, sortDir),
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasNextPage = rows.length > limit;
  const files = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? (files[files.length - 1]?.id ?? null) : null;

  return { files: files as FileRow[], hasNextPage, nextCursor };
}
