/**
 * Issues — Sequential Issue Number Assignment
 *
 * Assigns the next number atomically using a SELECT MAX + 1 inside a Prisma
 * interactive transaction with a row-level lock, preventing duplicate numbers
 * on concurrent inserts.
 */

import type { PrismaClient, Prisma } from "@prisma/client";

/** A PrismaClient OR a Prisma interactive-transaction client. */
export type DbOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * Returns the next sequential issue number for a project.
 * Must be called inside a Prisma transaction.
 *
 * @example
 * await db.$transaction(async (tx) => {
 *   const number = await getNextIssueNumber(projectId, tx);
 *   return tx.issue.create({ data: { number, ...rest } });
 * });
 */
export async function getNextIssueNumber(
  projectId: string,
  db: DbOrTx
): Promise<number> {
  const result = await db.$queryRaw<[{ max: bigint | null }]>`
    SELECT MAX(number) AS max
    FROM issues
    WHERE project_id = ${projectId}
    FOR UPDATE
  `;
  const current = result[0]?.max ?? null;
  return current !== null ? Number(current) + 1 : 1;
}
