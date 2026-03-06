import { AppError } from "@/shared/errors";
import type { PrismaClient, VaultFile } from "@prisma/client";

export async function fetchActiveFile(
  fileId: string,
  db: PrismaClient
): Promise<VaultFile> {
  const file = await db.vaultFile.findFirst({
    where: { id: fileId, status: "ACTIVE", deletedAt: null },
  });

  if (!file) throw AppError.notFound("File not found or not yet confirmed");

  return file;
}
