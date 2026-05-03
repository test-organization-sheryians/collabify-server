/**
 * Create the workspace, seed all 4 system roles, and create the OWNER membership
 * in a single atomic transaction.
 *
 * WorkspaceMember.role was dropped in the authorization schema migration —
 * membership now requires a roleId FK to the `roles` table.
 * System roles (OWNER/ADMIN/MEMBER/GUEST) must be created within the same
 * transaction so they exist before the member row is inserted.
 *
 * Handles Prisma unique-constraint (P2002) and FK (P2003) errors.
 */
import { AppError } from "@/shared/errors";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { addRoleMember } from "@/modules/authorization";
import { SYSTEM_GRANTS } from "../../../../../../prisma/seeds/shared/system-grants";



const SYSTEM_ROLES = [
  { name: "OWNER", rank: 100, description: "Full control over the workspace" },
  { name: "ADMIN", rank: 80,  description: "Manage members, projects, and settings" },
  { name: "MEMBER", rank: 50, description: "Standard workspace member" },
  { name: "GUEST",  rank: 10, description: "Limited read-only access" },
] as const;



// ── Role-permission grants ────────────────────────────────────────────────────
// Canonical source of truth imported from prisma/seeds/shared/system-grants.ts.
// repair-role-permissions.ts uses the same constant, keeping both in sync.
const GRANTS = SYSTEM_GRANTS;


export async function insertWorkspace(
  sanitizedName: string,
  normalizedSlug: string,
  userId: string,
  lockKey: string,
  db: PrismaClient,
  redis: Redis
) {
  try {
    const txResult = await db.$transaction(async (tx) => {
      // 1. Create the workspace
      const workspace = await tx.workspace.create({
        data: {
          name: sanitizedName,
          slug: normalizedSlug,
        },
      });

      // 2. Seed system workspace roles (scopeType=WORKSPACE, projectId=null)
      const roles = await Promise.all(
        SYSTEM_ROLES.map((r) =>
          tx.role.create({
            data: {
              workspaceId: workspace.id,
              projectId: null,  // workspace-wide — not tied to any project
              name: r.name,
              rank: r.rank,
              description: r.description,
              isSystem: true,
              scopeType: "WORKSPACE",
            },
          })
        )
      );


      // 3. Build a name → id map for workspace system roles
      const roleMap = new Map(roles.map((r) => [r.name, r.id]));

      // 4. Load all permissions from DB (seeded once at deploy via bun run db:seed:auth)
      const allPerms = await tx.permission.findMany({
        select: { id: true, resource: true, action: true },
      });
      const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]));

      // 5. Assign role-permissions for all workspace system roles
      const rolePermData: { roleId: string; permissionId: string; effect: "ALLOW" }[] = [];
      const missingPerms: string[] = [];
      for (const grant of GRANTS) {
        const permId = permMap.get(`${grant.resource}:${grant.action}`);
        if (!permId) {
          // Permission row missing from DB — run seed-permissions.ts first.
          // Collect missing permissions for the warning log below.
          missingPerms.push(`${grant.resource}:${grant.action}`);
          continue;
        }
        for (const roleName of grant.roles) {
          const roleId = roleMap.get(roleName);
          if (!roleId) continue;
          rolePermData.push({ roleId, permissionId: permId, effect: "ALLOW" });
        }
      }

      if (missingPerms.length > 0) {
        // Log to TX context — visible in server logs immediately.
        // Run `bun run prisma/seeds/seed-permissions.ts` then
        // `bun run prisma/seeds/repair-role-permissions.ts` to fix.
        console.warn(
          `⚠️  insertWorkspace: ${missingPerms.length} permissions missing from DB — ` +
          `these will NOT be assigned to system roles for workspace ${workspace.id}. ` +
          `Missing: ${missingPerms.join(", ")}. ` +
          `Run seed-permissions.ts + repair-role-permissions.ts to fix.`
        );
      }

      if (rolePermData.length > 0) {
        await tx.rolePermission.createMany({ data: rolePermData, skipDuplicates: true });
      }

      // 6. Create the creator as OWNER member
      const ownerRole = roles.find((r) => r.name === "OWNER")!;
      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          roleId: ownerRole.id,
        },
      });

      return { workspace, ownerRoleId: ownerRole.id };
    });

    // Seed role-member index for the new OWNER outside the transaction
    // (Redis failure must never roll back workspace creation)
    await addRoleMember(txResult.ownerRoleId, userId, redis).catch(() => {
      console.warn(
        `insertWorkspace: failed to seed role-member index for owner ${userId} — ` +
        `will re-populate on next invalidateRole call`
      );
    });

    return txResult.workspace;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        await redis.del(lockKey);
        throw AppError.conflict(
          "Workspace URL is already taken.",
          "WORKSPACE_CREATION_DB_CONFLICT"
        );
      }
      if (error.code === "P2003") {
        await redis.del(lockKey);
        throw new AppError(
          "User account issue. Please re-login.",
          "UNAUTHORIZED",
          401
        );
      }
    }
    throw error;
  }
}
