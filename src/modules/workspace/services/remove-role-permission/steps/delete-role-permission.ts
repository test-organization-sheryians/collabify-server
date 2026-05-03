import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

export async function deleteRolePermission(
  roleId: string,
  workspaceId: string,
  permissionId: string,
  db: PrismaClient
) {
  // Verify role belongs to this workspace
  const role = await db.role.findUnique({
    where: { id: roleId },
    select: { workspaceId: true },
  });
  if (!role) throw AppError.notFound("Role not found");
  if (role.workspaceId !== workspaceId) throw AppError.forbidden("Role does not belong to this workspace");

  try {
    await db.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  } catch (err) {
    // P2025: record to delete not found — treat as idempotent success
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return true;
    }
    throw err;
  }

  return true;
}
