/** Fetch all RolePermission rows for a role, including permission metadata. */
import type { PrismaClient } from "@prisma/client";

export async function fetchRolePermissions(roleId: string, db: PrismaClient) {
  const rows = await db.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
    orderBy: [
      { permission: { resource: "asc" } },
      { permission: { action: "asc" } },
    ],
  });

  // Serialize conditions (Prisma JsonValue) → String for GraphQL
  return rows.map((r) => ({
    ...r,
    conditions: r.conditions != null ? JSON.stringify(r.conditions) : null,
  }));
}

