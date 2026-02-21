/**
 * Step 3 — Upsert Collaborators
 *
 * Parallel upsert for all collaborators: creates the record if new, updates
 * the role if already a collaborator. Returns full records with user join for
 * the resolver mapper.
 *
 * WHY upsert in Promise.all (not createMany):
 * Prisma's createMany does not return created records and does not support
 * returning the full row. upsert per-user in parallel handles both create
 * and role-update semantics in a single operation.
 */

import type { PrismaClient } from "@prisma/client";
import type { UpsertedCollaborator } from "../types";
import type { AddPageCollaboratorsInput } from "../schema";

export async function upsertCollaborators(
  pageId: string,
  collaborators: AddPageCollaboratorsInput["collaborators"],
  db: PrismaClient
): Promise<UpsertedCollaborator[]> {
  return Promise.all(
    collaborators.map((c) =>
      db.pageCollaborator.upsert({
        where: { pageId_userId: { pageId, userId: c.userId } },
        create: {
          pageId,
          userId: c.userId,
          role: c.role as any,
        },
        update: { role: c.role as any },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
        },
      })
    )
  ) as Promise<UpsertedCollaborator[]>;
}
