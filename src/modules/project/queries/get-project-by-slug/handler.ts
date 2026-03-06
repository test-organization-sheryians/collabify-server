/**
 * getProjectBySlug — Query Handler
 *
 * Single DB call — no steps/ needed.
 * Signature fixed to (input, ctx) to match module-wide convention.
 * Infra import removed; uses ctx.db.
 */
import { SlugUtil } from "@/shared/utils/slug.util";
import type { ServiceContext } from "@/graphql/types";
import type { GetProjectBySlugInput } from "./types";

export const getProjectBySlug = async (
  input: GetProjectBySlugInput,
  ctx: ServiceContext
) => {
  const { workspaceId, slug } = input;
  const normalizedSlug = SlugUtil.sanitize(slug).toLowerCase();

  return ctx.db.project.findFirst({
    where: { workspaceId, key: normalizedSlug },
  });
};
