/** Update the workspace fields. Returns updated workspace. Throws NOT_FOUND if missing. */
import { AppError } from "@/shared/errors";
import type { PrismaClient } from "@prisma/client";

interface UpdateData {
  name?: string;
  logoUrl?: string | null;
  domainWhitelist?: string | null;
}

export async function updateWorkspaceFields(
  workspaceId: string,
  data: UpdateData,
  db: PrismaClient
) {
  if (
    !data.name &&
    data.logoUrl === undefined &&
    data.domainWhitelist === undefined
  ) {
    const existing = await db.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!existing) throw AppError.notFound("Workspace not found");
    return existing;
  }

  try {
    return await db.workspace.update({
      where: { id: workspaceId },
      data,
    });
  } catch {
    throw AppError.notFound("Workspace not found");
  }
}
