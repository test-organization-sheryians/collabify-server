import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";

/**
 * assertAccess — auth gate for getDmByUsers.
 *
 * getDmByUsers only requires an authenticated session (🔐 userId).
 * Per auth-api-inventory, no workspace/project member assertion is needed —
 * the query is scoped to conversations the caller is already a member of via
 * the DB filter (members.some({ userId })).
 *
 * The original handler incorrectly used assertProjectMember here, which was
 * both wrong and a potential silent bypass if getProject returned null.
 *
 * @throws AppError 401  if ctx.authGate or ctx.permissions is missing (unauthenticated)
 */
export async function assertAccess(ctx: ServiceContext): Promise<void> {
  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();
}
