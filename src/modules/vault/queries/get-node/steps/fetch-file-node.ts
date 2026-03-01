import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";
import type { FileNode } from "../types";

export async function fetchFileNode(
  id: string,
  db: PrismaClient
): Promise<FileNode> {
  const file = await db.vaultFile.findFirst({
    where: { id, status: "ACTIVE", deletedAt: null },
    include: {
      uploader: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  if (!file) throw AppError.notFound("File not found");

  return file as FileNode;
}
