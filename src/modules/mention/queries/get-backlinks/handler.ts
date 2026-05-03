/**
 * getBacklinks — Query Handler
 *
 * Fetches backlinks for a target entity with filtering and pagination.
 *
 * Steps:
 *   1. fetchBacklinks — query with filters, cursor pagination, include mention
 */
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetBacklinksInput } from "./schema";
import { fetchBacklinks } from "./steps/fetch-backlinks";

export const handler = async (
  input: GetBacklinksInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized();

  return fetchBacklinks(input, ctx);
};
