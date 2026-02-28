/**
 * DataLoader: userById
 *
 * Batches DB calls for the Page.creator field resolver.
 * Without DataLoader, fetching 20 pages would fire 20 separate DB queries for user data.
 * With DataLoader, all 20 userIds are batched into one WHERE IN query.
 */

import DataLoader from "dataloader";
import { db } from "@/infra/db";

/**
 * Creates a per-request DataLoader that batches user lookups by userId.
 *
 * Key ordering: DataLoader requires the result array to be in the same order
 * as the input keys array. Missing users must be null, not omitted.
 *
 * TODO: Implement batchFn
 * async (userIds: readonly string[]) => {
 *   const users = await db.user.findMany({ where: { id: { in: [...userIds] } } })
 *   const userMap = new Map(users.map(u => [u.id, u]))
 *   return userIds.map(id => userMap.get(id) ?? null)
 * }
 */
export function createUserByIdLoader() {
  // TODO: return new DataLoader<string, PrismaUser | null>(async (userIds) => {
  //   const users = await db.user.findMany({ where: { id: { in: [...userIds] } } })
  //   const userMap = new Map(users.map(u => [u.id, u]))
  //   return userIds.map(id => userMap.get(id) ?? null)
  // })
  throw new Error("createUserByIdLoader: not implemented");
}
