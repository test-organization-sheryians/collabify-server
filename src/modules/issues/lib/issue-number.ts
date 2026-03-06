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
  // Acquire per-project advisory lock AND read MAX(number) in ONE query.
  //
  // A single client.query() call avoids the pg@8 deprecation warning
  // "Calling client.query() when the client is already executing a query"
  // which fires when $executeRaw + $queryRaw are dispatched sequentially
  // on the same transaction connection.
  //
  // pg_advisory_xact_lock() serializes concurrent createIssue calls for the
  // same project (released automatically at transaction end). The lock key is
  // derived from a hash of the projectId string.
  const result = await db.$queryRaw<
    [{ _lock: string | null; max: bigint | null }]
  >`
    SELECT
      pg_advisory_xact_lock(('x' || substr(md5(${projectId}), 1, 16))::bit(64)::bigint)::text AS _lock,
      MAX(number) AS max
    FROM issues
    WHERE project_id = ${projectId}
  `;

  const current = result[0]?.max ?? null;
  return current !== null ? Number(current) + 1 : 1;
}
