/**
 * createProject — Service Handler (thin orchestrator)
 *
 * Auth:
 *   - assertWorkspaceMember — must be a workspace member to create projects
 *   - permissions.assert("project:create") — RBAC check
 * Steps:
 *   1. [auth] assertWorkspaceMember + assert("project:create") — parallel
 *   2. normalizeAndValidateSlug  — lowercase, sanitize, reject reserved keywords
 *   3. verifySlugReservation     — assert user holds Redis lock; return lockKey
 *   4. insertProject             — $transaction: project.create + projectMember.create
 *   5. finalizeProjectLock       — promote lock → exists-cache; swallow Redis errors
 */
import { AppError } from "@/shared/errors";
import { createLogger } from "@/shared/lib/logger";
import type { ServiceContext } from "@/graphql/types";
import type { CreateProjectInput } from "./types";
import { normalizeAndValidateSlug } from "./steps/normalize-and-validate-slug";
import { verifySlugReservation } from "./steps/verify-slug-reservation";
import { insertProject } from "./steps/insert-project";
import { finalizeProjectLock } from "./steps/finalize-project-lock";

const logger = createLogger("project:services:create-project");

export const createProject = async (
  input: {
    workspaceId: string;
    input: CreateProjectInput;
    userId: string;
  },
  ctx: ServiceContext
) => {
  const { workspaceId, input: rawInput, userId } = input;
  const { db, redis } = ctx;

  if (!ctx.authGate || !ctx.permissions) throw AppError.unauthorized();

  const sanitizedInput = {
    ...rawInput,
    name: rawInput.name.trim().replace(/[<>]/g, ""),
    description: rawInput.description
      ? rawInput.description.trim().replace(/[<>]/g, "")
      : undefined,
  };

  const scope = { type: "workspace" as const, id: workspaceId };
  await Promise.all([
    ctx.authGate.assertWorkspaceMember(workspaceId),
    ctx.permissions.assert("project:create", scope),
  ]);

  const slug = normalizeAndValidateSlug(
    sanitizedInput.slug ?? "",
    sanitizedInput.name
  );
  const lockKey = await verifySlugReservation(workspaceId, slug, userId, redis);
  const project = await insertProject(
    workspaceId,
    userId,
    slug,
    sanitizedInput,
    db
  );

  await finalizeProjectLock(workspaceId, slug, lockKey, userId, redis);

  logger.info("Project created", {
    projectId: project.id,
    slug,
    workspaceId,
    userId,
  });

  return project;
};
