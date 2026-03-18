import { AppError } from "@/shared/errors";
import type { PrismaClient, Prisma } from "@prisma/client";

export async function upsertRolePermission(
  roleId: string,
  workspaceId: string,
  permissionId: string,
  effect: "ALLOW" | "DENY",
  conditionsJson: string | undefined,
  db: PrismaClient
) {
  // Verify role belongs to this workspace
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: { workspaceId: true },
  });
  if (!role) throw AppError.notFound("Role not found");
  if (role.workspaceId !== workspaceId) throw AppError.forbidden("Role does not belong to this workspace");

  // Verify permission exists
  const permission = await db.permission.findUnique({
    where: { id: permissionId },
    select: { id: true },
  });
  if (!permission) throw AppError.notFound("Permission not found");

  // Parse conditions if provided — fail fast on invalid JSON
  let conditions: Prisma.InputJsonValue | undefined;
  if (conditionsJson) {
    try {
      conditions = JSON.parse(conditionsJson) as Prisma.InputJsonValue;
    } catch {
      throw AppError.badRequest("conditions must be valid JSON");
    }
  }

  return db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    create: {
      roleId,
      permissionId,
      effect,
      ...(conditions !== undefined && { conditions }),
    },
    update: {
      effect,
      ...(conditions !== undefined && { conditions }),
    },
    include: { permission: true },
  });
}
