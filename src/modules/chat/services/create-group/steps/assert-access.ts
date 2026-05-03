import type { ServiceContext } from "@/graphql/types";
import { AppError } from "@/shared/errors";
import type { CreateGroupInput } from "../types";

export interface AssertAccessOutput {
  otherMembers: string[];
  normalizedName: string;
}

/**
 * assertAccess logic for create-group.
 * Isolates RBAC checks mapping specifically to `chat:dm:create`, evaluates internal
 * project viability limits, deduplicates incoming lists, and validates capacity blocks natively.
 */
export async function assertAccess(
  input: CreateGroupInput,
  ctx: ServiceContext
): Promise<AssertAccessOutput> {
  if (!ctx.authGate || !ctx.permissions || !ctx.auth?.userId) {
    throw AppError.unauthorized();
  }

  const { userId } = ctx.auth;
  const { workspaceId, projectId, name, memberUserIds } = input;

  // Step 0 — project member gate (cache-backed)
  const proj = await ctx.authGate.getProject(projectId);
  const scope = {
    type: "project" as const,
    id: projectId,
    workspaceId: proj?.workspaceId ?? workspaceId,
  };
  await Promise.all([
    ctx.authGate.assertProjectMember(projectId),
    ctx.permissions.assert("chat:dm:create", scope),
  ]);

  // 1. Verify project exists and is not archived/deleted
  const project = await ctx.db.project.findUnique({
    where: { id: projectId },
    select: { id: true, isArchived: true, deletedAt: true, workspaceId: true },
  });

  if (!project) throw AppError.notFound("Project not found");
  if (project.deletedAt) {
    throw AppError.badRequest("Cannot create group in deleted project");
  }
  if (project.isArchived) {
    throw AppError.badRequest("Cannot create group in archived project");
  }
  if (project.workspaceId !== workspaceId) {
    throw AppError.badRequest("Project does not belong to this workspace");
  }

  // 2. Validate group name (reserved names)
  const normalizedName = name.trim().toLowerCase();

  // 3. Deduplicate member IDs
  const uniqueMemberIds = Array.from(new Set(memberUserIds));

  // 4. Validate minimum group size (creator + at least 1 other member)
  const otherMembers = uniqueMemberIds.filter((id) => id !== userId);
  if (otherMembers.length === 0) {
    throw AppError.badRequest(
      "Group must have at least one other member besides the creator"
    );
  }

  return { otherMembers, normalizedName };
}
