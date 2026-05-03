/**
 * getMentionEvents — Query Handler
 *
 * Fetches MentionEvent records for a specific mention.
 */
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import type { GetMentionEventsInput } from "./schema";
import { fetchMentionEvents } from "./steps/fetch-events";

export const handler = async (
  input: GetMentionEventsInput,
  ctx: ServiceContext
) => {
  const { userId } = ctx.auth;
  if (!userId) throw AppError.unauthorized();

  return fetchMentionEvents(input.mentionId, ctx);
};
