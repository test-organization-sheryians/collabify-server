/**
 * Step 2 — Update Record
 *
 * Performs a partial update on the Page row.
 * Only fields explicitly passed (non-undefined) are written.
 * null clears the field; omitting the key skips it entirely.
 */

import type { PrismaClient, Page } from "@prisma/client";

export async function updateRecord(
  pageId: string,
  fields: { emoji?: string | null; coverImageUrl?: string | null },
  db: PrismaClient
): Promise<Page> {
  const data: Record<string, unknown> = {};
  if (fields.emoji !== undefined) data.emojiIcon = fields.emoji;
  if (fields.coverImageUrl !== undefined) data.coverImageUrl = fields.coverImageUrl;

  return db.page.update({
    where: { id: pageId },
    data,
  });
}
