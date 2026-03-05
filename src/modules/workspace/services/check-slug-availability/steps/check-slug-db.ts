/** Check if a workspace with this slug already exists in the database. */
import type { PrismaClient } from "@prisma/client";

export async function checkSlugDb(
  normalizedSlug: string,
  db: PrismaClient
): Promise<boolean> {
  const existing = await db.workspace.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });
  return !!existing;
}
