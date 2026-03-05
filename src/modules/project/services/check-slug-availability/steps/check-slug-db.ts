/** Check if a project with this key already exists in the workspace. */
import type { PrismaClient } from "@prisma/client";

export async function checkSlugDb(
  workspaceId: string,
  normalizedSlug: string,
  db: PrismaClient
): Promise<boolean> {
  const existing = await db.project.findUnique({
    where: { workspaceId_key: { workspaceId, key: normalizedSlug } },
    select: { id: true },
  });
  return !!existing;
}
