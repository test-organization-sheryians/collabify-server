import { ServiceContext } from "../../graphql/types";
import { AppError } from "../errors";

/**
 * Ensures the user is authenticated and loads the user object from the dataloader.
 * Throws UNAUTHORIZED if not authenticated or user not found.
 */
export async function requireUser(ctx: ServiceContext) {
  if (!ctx.auth?.userId) {
    throw AppError.unauthorized("Unauthorized");
  }

  const user = await ctx.dataloaders.user.userByClerkId.load(ctx.auth.userId);

  if (!user) {
    throw AppError.unauthorized("User not found");
  }

  return user;
}
