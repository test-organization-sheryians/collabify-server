/**
 * getMentions — Query Handler
 *
 * Fetches all ACTIVE mentions from a source entity.
 */
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMentionsInput } from "./schema";
import { fetchMentionsBySource } from "./steps/fetch-mentions";

export const handler = async (
  input: GetMentionsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized();

  return fetchMentionsBySource(input.sourceEntityId, ctx);
};
