#!/usr/bin/env bun
/**
 * reset-rbac.ts
 *
 * ONE-TIME migration script: wipes and rebuilds the entire RBAC/ABAC
 * database state to match the new colon-notation permission manifests.
 *
 * ─── DESTRUCTIVE ────────────────────────────────────────────────────────────
 *   Deletes: all custom Role rows, all RolePermission rows,
 *            all ResourcePolicy rows, all Permission rows
 *
 * ─── PRESERVED ──────────────────────────────────────────────────────────────
 *   Kept:    Workspace, Project, User, WorkspaceMember, ProjectMember rows,
 *            and all content (Issues, Pages, Boards, Chat, Vault)
 *   Note:    WorkspaceMember.roleId and ProjectMember.projectRoleId are
 *            re-assigned to the new system role ids
 *
 * ─── USAGE ──────────────────────────────────────────────────────────────────
 *   bun run scripts/reset-rbac.ts              # interactive confirmation
 *   bun run scripts/reset-rbac.ts --yes        # skip confirmation (CI)
 *   bun run scripts/reset-rbac.ts --dry-run    # inspect without writing
 *
 * ─── DEPLOYMENT ORDER ───────────────────────────────────────────────────────
 *   1. Run this script BEFORE deploying new server code
 *   2. Deploy new server
 *   3. Server boot → syncPermissions + syncSystemRoles auto-validate
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { join } from "path";

// ── Module permission manifests ──────────────────────────────────────────────
import { WORKSPACE_PERMISSIONS } from "../src/modules/workspace/permissions";
import { PROJECT_PERMISSIONS }   from "../src/modules/project/permissions";
import { ISSUE_PERMISSIONS }     from "../src/modules/issues/permissions";
import { PAGE_PERMISSIONS }      from "../src/modules/pages/permissions";
import { BOARD_PERMISSIONS }     from "../src/modules/whiteboard/permissions";
import { CHAT_PERMISSIONS }      from "../src/modules/chat/permissions";
import { VAULT_PERMISSIONS }     from "../src/modules/vault/permissions";

// ── Bootstrap grants ─────────────────────────────────────────────────────────
import {
  WORKSPACE_GRANTS,
  PROJECT_GRANTS,
  WORKSPACE_SYSTEM_ROLES,
  PROJECT_SYSTEM_ROLES,
} from "../src/modules/authorization/bootstrap/sync-system-roles";

// ── Config ───────────────────────────────────────────────────────────────────

const IS_DRY_RUN = process.argv.includes("--dry-run");
const AUTO_YES   = process.argv.includes("--yes");

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) { console.log(msg); }
function warn(msg: string) { console.warn(`  ⚠️  ${msg}`); }
function step(n: number, msg: string) { log(`\n✅ Step ${n}: ${msg}`); }
function dryLog(msg: string) { log(`  [DRY RUN] ${msg}`); }

/** Collect all permissions from every module manifest */
function collectAllPermissions() {
  return [
    ...WORKSPACE_PERMISSIONS,
    ...PROJECT_PERMISSIONS,
    ...ISSUE_PERMISSIONS,
    ...PAGE_PERMISSIONS,
    ...BOARD_PERMISSIONS,
    ...CHAT_PERMISSIONS,
    ...VAULT_PERMISSIONS,
  ] as Array<{ resource: string; action: string; module: string; description: string; hasConditions: boolean }>;
}

/** Simple readline confirmation */
async function confirm(question: string): Promise<boolean> {
  process.stdout.write(`\n${question} (yes/no): `);
  for await (const line of console) {
    return line.trim().toLowerCase() === "yes";
  }
  return false;
}

// ── Main migration ────────────────────────────────────────────────────────────

async function main() {
  // Instantiate clients here so env is fully resolved
  const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const db      = new PrismaClient({ adapter });
  const redis   = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

  log("\n" + "═".repeat(70));
  log("  Collabify RBAC/ABAC Database Reset Migration");
  log("  reset-rbac.ts");
  log("═".repeat(70));

  if (IS_DRY_RUN) {
    log("\n  🔍 DRY RUN MODE — no database writes will occur\n");
  }

  // ── Step 1: Pre-flight check ───────────────────────────────────────────────

  log("\n🔎 Step 1: Pre-flight check...");

  const [
    permCount,
    totalRoleCount,
    customRoleCount,
    rpCount,
    resourcePolicyCount,
    workspaceCount,
    projectCount,
    workspaceMemberCount,
    projectMemberCount,
  ] = await Promise.all([
    db.permission.count(),
    db.role.count(),
    db.role.count({ where: { isSystem: false } }),
    db.rolePermission.count(),
    db.resourcePolicy.count(),
    db.workspace.count(),
    db.project.count(),
    db.workspaceMember.count(),
    db.projectMember.count(),
  ]);

  log(`
  Database state (BEFORE migration):
  ─────────────────────────────────────────────
  Workspaces:          ${workspaceCount}
  Projects:            ${projectCount}
  WorkspaceMembers:    ${workspaceMemberCount}
  ProjectMembers:      ${projectMemberCount}
  ─────────────────────────────────────────────
  Permissions (stale): ${permCount}
  Roles (total):       ${totalRoleCount}
  Roles (custom):      ${customRoleCount}   ← WILL BE DELETED
  RolePermissions:     ${rpCount}           ← WILL BE DELETED
  ResourcePolicies:    ${resourcePolicyCount} ← WILL BE DELETED
  `);

  const newPerms = collectAllPermissions();
  log(`  New permissions from manifests: ${newPerms.length}`);

  if (!IS_DRY_RUN && !AUTO_YES) {
    const ok = await confirm(
      `  ⚠️  This will permanently delete ${customRoleCount} custom roles and rebuild all auth data.\n  Continue?`
    );
    if (!ok) {
      log("\n  Aborted.");
      process.exit(0);
    }
  }

  // ── Step 2: Validate manifests have no dot-notation ───────────────────────

  log("\n🔎 Step 2: Validating manifests (no dot-notation)...");
  const dotViolations = newPerms.filter(p => p.resource.includes("."));
  if (dotViolations.length > 0) {
    log("  ❌ Dot-notation found in manifests — fix before running migration:");
    dotViolations.forEach(p => log(`     resource="${p.resource}" (${p.module})`));
    process.exit(1);
  }
  log("  ✅ No dot-notation violations in manifests");

  if (IS_DRY_RUN) {
    dryLog(`Would delete ${customRoleCount} custom roles`);
    dryLog(`Would delete ${rpCount} role-permissions`);
    dryLog(`Would delete ${resourcePolicyCount} ABAC resource policies`);
    dryLog(`Would delete ${permCount} permissions`);
    dryLog(`Would insert ${newPerms.length} permissions`);
    dryLog(`Would seed system roles for ${workspaceCount} workspaces + ${projectCount} projects`);
    dryLog(`Would reassign ${workspaceMemberCount} workspace members`);
    dryLog(`Would reassign ${projectMemberCount} project members`);
    log("\n  Dry run complete. No changes made.\n");
    process.exit(0);
  }

  // ── Step 3: Delete custom roles ────────────────────────────────────────────
  // FK order: RolePermission → Role (must delete RP first)
  //           WorkspaceMember.roleId → Role (must reassign FIRST)
  //           ProjectMember.projectRoleId → Role (must reassign FIRST)
  //
  // Strategy: reassign members pointing at custom roles to the system MEMBER /
  // CONTRIBUTOR role for their workspace BEFORE deleting the custom role rows.

  step(3, "Pre-reassigning members off custom roles, then deleting...");

  const customRoles = await db.role.findMany({
    where: { isSystem: false },
    select: { id: true, workspaceId: true, scopeType: true },
  });
  const customRoleIds = customRoles.map(r => r.id);
  log(`     Found ${customRoleIds.length} custom roles`);

  if (customRoleIds.length > 0) {
    // 3-A:Delete RolePermissions for custom roles first (no member FK here)
    const customRpDeleted = await db.rolePermission.deleteMany({
      where: { roleId: { in: customRoleIds } },
    });
    log(`     Deleted ${customRpDeleted.count} role-permissions for custom roles`);

    // 3-B: For each workspace, find the MEMBER system role id
    //      then move WorkspaceMember rows off custom roles
    const workspaceSystemRoles = await db.role.findMany({
      where: { isSystem: true, scopeType: "WORKSPACE", name: "MEMBER" },
      select: { id: true, workspaceId: true },
    });
    for (const sysRole of workspaceSystemRoles) {
      await db.workspaceMember.updateMany({
        where: {
          workspaceId: sysRole.workspaceId,
          roleId: { in: customRoleIds },
        },
        data: { roleId: sysRole.id },
      });
    }
    log(`     Reassigned workspace members off custom roles → MEMBER`);

    // 3-C: For each project, find the CONTRIBUTOR system role id
    //      then move ProjectMember rows off custom roles
    const projectSystemRoles = await db.role.findMany({
      where: { isSystem: true, scopeType: "PROJECT", name: "CONTRIBUTOR", projectId: { not: null } },
      select: { id: true, projectId: true },
    });
    for (const sysRole of projectSystemRoles) {
      await db.projectMember.updateMany({
        where: {
          projectId: sysRole.projectId!,
          projectRoleId: { in: customRoleIds },
        },
        data: { projectRoleId: sysRole.id },
      });
    }
    log(`     Reassigned project members off custom roles → CONTRIBUTOR`);

    // 3-D: Now safe to delete custom roles (no FK dependents remain)
    const deletedCustomRoles = await db.role.deleteMany({ where: { isSystem: false } });
    log(`     Deleted ${deletedCustomRoles.count} custom roles`);
  } else {
    log(`     No custom roles to delete`);
  }

  // ── Step 4: Delete all RolePermissions ────────────────────────────────────

  step(4, "Deleting all role-permissions...");
  const deletedRp = await db.rolePermission.deleteMany({});
  log(`     Deleted ${deletedRp.count} role-permission rows`);

  // ── Step 5: Delete all ResourcePolicies (ABAC) ────────────────────────────

  step(5, "Deleting all ABAC resource policies...");
  const deletedPolicies = await db.resourcePolicy.deleteMany({});
  log(`     Deleted ${deletedPolicies.count} resource policy rows`);

  // ── Step 6: Delete all Permissions ────────────────────────────────────────

  step(6, "Deleting all stale permissions...");
  const deletedPerms = await db.permission.deleteMany({});
  log(`     Deleted ${deletedPerms.count} permission rows`);

  // ── Step 7: Re-insert permissions from manifests ──────────────────────────

  step(7, "Inserting permissions from manifests...");
  await db.permission.createMany({
    data: newPerms.map(p => ({
      resource:      p.resource,
      action:        p.action,
      description:   p.description,
      module:        p.module,
      hasConditions: p.hasConditions ?? false,
    })),
    skipDuplicates: true,
  });

  // Build permMap: "resource:action" → id
  const freshPerms = await db.permission.findMany({
    select: { id: true, resource: true, action: true },
  });
  const permMap = new Map<string, string>();
  for (const p of freshPerms) permMap.set(`${p.resource}:${p.action}`, p.id);
  log(`     Inserted ${permMap.size} permissions`);

  // ── Step 8 + 9: System roles + workspace grants ───────────────────────────

  step(8, "Upserting workspace system roles and grants...");

  const workspaces = await db.workspace.findMany({ select: { id: true, slug: true } });
  const wsRoleMaps = new Map<string, Map<string, string>>(); // workspaceId → roleName→roleId

  let totalWsRpCount = 0;

  for (const ws of workspaces) {
    const roleNameMap = new Map<string, string>();

    for (const r of WORKSPACE_SYSTEM_ROLES) {
      let role = await db.role.findFirst({
        where: { workspaceId: ws.id, projectId: null, name: r.name, scopeType: "WORKSPACE" },
      });
      if (role) {
        role = await db.role.update({
          where: { id: role.id },
          data: { rank: r.rank, description: r.description, isSystem: true },
        });
      } else {
        role = await db.role.create({
          data: {
            workspaceId: ws.id,
            projectId:   null,
            name:        r.name,
            rank:        r.rank,
            description: r.description,
            isSystem:    true,
            scopeType:   "WORKSPACE",
          },
        });
      }
      roleNameMap.set(r.name, role.id);
    }

    wsRoleMaps.set(ws.id, roleNameMap);

    // Seed workspace grants
    for (const grant of WORKSPACE_GRANTS) {
      const permId = permMap.get(`${grant.resource}:${grant.action}`);
      if (!permId) {
        warn(`Permission not found: "${grant.resource}:${grant.action}" — skipping`);
        continue;
      }
      for (const roleName of grant.roles) {
        const roleId = roleNameMap.get(roleName);
        if (!roleId) continue;
        await db.rolePermission.create({ data: { roleId, permissionId: permId, effect: "ALLOW" } });
        totalWsRpCount++;
      }
    }

    log(`    ✓ ${ws.slug}: ${roleNameMap.size} roles, grants seeded`);
  }

  log(`     Total workspace role-permissions: ${totalWsRpCount}`);

  // ── Step 10 + 11: Project system roles + project grants ───────────────────

  step(10, "Upserting project system roles and grants...");

  const projects = await db.project.findMany({
    select: { id: true, name: true, workspaceId: true },
  });

  const projectRoleMaps = new Map<string, Map<string, string>>(); // projectId → roleName→roleId
  let totalProjectRpCount = 0;

  for (const project of projects) {
    const roleNameMap = new Map<string, string>();

    for (const r of PROJECT_SYSTEM_ROLES) {
      let role = await db.role.findFirst({
        where: { workspaceId: project.workspaceId, projectId: project.id, name: r.name, scopeType: "PROJECT" },
      });
      if (role) {
        role = await db.role.update({
          where: { id: role.id },
          data: { rank: r.rank, description: r.description, isSystem: true },
        });
      } else {
        role = await db.role.create({
          data: {
            workspaceId: project.workspaceId,
            projectId:   project.id,
            name:        r.name,
            rank:        r.rank,
            description: r.description,
            isSystem:    true,
            scopeType:   "PROJECT",
          },
        });
      }
      roleNameMap.set(r.name, role.id);
    }

    projectRoleMaps.set(project.id, roleNameMap);

    // Seed project grants
    for (const grant of PROJECT_GRANTS) {
      const permId = permMap.get(`${grant.resource}:${grant.action}`);
      if (!permId) {
        warn(`Permission not found: "${grant.resource}:${grant.action}" — skipping`);
        continue;
      }
      for (const roleName of grant.roles) {
        const roleId = roleNameMap.get(roleName);
        if (!roleId) continue;
        await db.rolePermission.create({ data: { roleId, permissionId: permId, effect: "ALLOW" } });
        totalProjectRpCount++;
      }
    }
  }

  log(`     ${projects.length} projects processed, ${totalProjectRpCount} role-permissions seeded`);

  // ── Step 12: Reassign workspace member roles ──────────────────────────────

  step(12, "Reassigning workspace member roles...");

  // Map old role names → canonical system role names
  const WS_ROLE_NAME_MAP: Record<string, string> = {
    OWNER:   "OWNER",
    ADMIN:   "ADMIN",
    MEMBER:  "MEMBER",
    GUEST:   "GUEST",
    VIEWER:  "GUEST",  // old name → map to GUEST
  };

  const workspaceMembers = await db.workspaceMember.findMany({
    include: { assignedRole: { select: { name: true, isSystem: true } } },
  });

  let wsReassignCount = 0;
  let wsSkipCount = 0;

  for (const member of workspaceMembers) {
    const currentRoleName = member.assignedRole?.name ?? "MEMBER";
    const targetRoleName  = WS_ROLE_NAME_MAP[currentRoleName] ?? "MEMBER";
    const wsRoleMap       = wsRoleMaps.get(member.workspaceId);

    if (!wsRoleMap) {
      warn(`No roles found for workspace ${member.workspaceId} — skipping member ${member.id}`);
      continue;
    }

    const targetRoleId = wsRoleMap.get(targetRoleName);
    if (!targetRoleId) {
      warn(`Role "${targetRoleName}" not found for workspace ${member.workspaceId}`);
      continue;
    }

    // If already pointing to the correct system role, skip
    if (member.roleId === targetRoleId) {
      wsSkipCount++;
      continue;
    }

    await db.workspaceMember.update({
      where: { id: member.id },
      data:  { roleId: targetRoleId },
    });
    wsReassignCount++;
  }

  log(`     Reassigned: ${wsReassignCount}, Already correct: ${wsSkipCount}`);

  // ── Step 13: Reassign project member roles ────────────────────────────────

  step(13, "Reassigning project member roles...");

  const PROJ_ROLE_NAME_MAP: Record<string, string> = {
    MANAGER:     "MANAGER",
    CONTRIBUTOR: "CONTRIBUTOR",
    GUEST:       "GUEST",
    VIEWER:      "GUEST",   // old name → GUEST
    MEMBER:      "CONTRIBUTOR",  // ambiguous old name → promote to CONTRIBUTOR
  };

  // We also need to enforce workspace GUEST ceiling:
  // If a workspace member's role rank <= 10, force to project GUEST

  // Build workspace member rank map: userId+workspaceId → rank
  const wsMembersWithRank = await db.workspaceMember.findMany({
    include: { assignedRole: { select: { rank: true } } },
  });
  const wsGuestMap = new Map<string, boolean>(); // `${userId}:${workspaceId}` → isGuest
  for (const m of wsMembersWithRank) {
    wsGuestMap.set(`${m.userId}:${m.workspaceId}`, (m.assignedRole?.rank ?? 50) <= 10);
  }

  const projectMembers = await db.projectMember.findMany({
    include: {
      projectRole: { select: { name: true, isSystem: true } },
      project:     { select: { workspaceId: true } },
    },
  });

  let projReassignCount = 0;
  let projSkipCount = 0;
  let guestCeilingEnforced = 0;

  for (const member of projectMembers) {
    const projectRoleMap = projectRoleMaps.get(member.projectId);
    if (!projectRoleMap) {
      warn(`No project roles for project ${member.projectId} — skipping member ${member.id}`);
      continue;
    }

    const currentRoleName = member.projectRole?.name ?? "CONTRIBUTOR";
    let   targetRoleName  = PROJ_ROLE_NAME_MAP[currentRoleName] ?? "CONTRIBUTOR";

    // Enforce workspace GUEST ceiling
    const workspaceId = member.project?.workspaceId;
    if (workspaceId) {
      const isWsGuest = wsGuestMap.get(`${member.userId}:${workspaceId}`) ?? false;
      if (isWsGuest && targetRoleName !== "GUEST") {
        targetRoleName = "GUEST";
        guestCeilingEnforced++;
      }
    }

    const targetRoleId = projectRoleMap.get(targetRoleName);
    if (!targetRoleId) {
      warn(`Role "${targetRoleName}" not found for project ${member.projectId}`);
      continue;
    }

    if (member.projectRoleId === targetRoleId) {
      projSkipCount++;
      continue;
    }

    await db.projectMember.update({
      where: { id: member.id },
      data:  { projectRoleId: targetRoleId },
    });
    projReassignCount++;
  }

  log(`     Reassigned: ${projReassignCount}, Already correct: ${projSkipCount}, Guest ceiling enforced: ${guestCeilingEnforced}`);

  // ── Step 14: Flush Redis auth cache ──────────────────────────────────────

  step(14, "Flushing Redis auth cache...");

  const keysToFlush = [
    "bootstrap:perm-manifest-hash",
    ...(await redis.keys("bootstrap:ws-roles-seeded:*")),
    ...(await redis.keys("perm:*")),
    ...(await redis.keys("role:*")),
    ...(await redis.keys("active_ctx:*")),
    ...(await redis.keys("auth:ctx:*")),
  ];

  if (keysToFlush.length > 0) {
    await redis.del(...keysToFlush);
  }

  log(`     Flushed ${keysToFlush.length} Redis keys`);

  // ── Step 15: Final report ─────────────────────────────────────────────────

  step(15, "Final verification...");

  const [finalPermCount, finalRoleCount, finalRpCount] = await Promise.all([
    db.permission.count(),
    db.role.count(),
    db.rolePermission.count(),
  ]);

  // Use raw SQL for null-check on non-nullable FK fields (Prisma rejects null filter)
  const nullWsResult   = await db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM workspace_members WHERE role_id IS NULL`;
  const nullProjResult = await db.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM project_members WHERE project_role_id IS NULL`;
  const finalNullWsRoles   = Number(nullWsResult[0]?.count ?? 0);
  const finalNullProjRoles = Number(nullProjResult[0]?.count ?? 0);

  log(`
  ┌─────────────────────────────────────────────────────────┐
  │              Migration Complete ✅                        │
  ├─────────────────────────────────────────────────────────┤
  │  Permissions:                ${String(finalPermCount).padEnd(28)} │
  │  Roles (system only):        ${String(finalRoleCount).padEnd(28)} │
  │  RolePermissions:            ${String(finalRpCount).padEnd(28)} │
  │  WorkspaceMembers (null FK): ${String(finalNullWsRoles).padEnd(28)} │
  │  ProjectMembers (null FK):   ${String(finalNullProjRoles).padEnd(28)} │
  └─────────────────────────────────────────────────────────┘
  `);

  if (finalNullWsRoles > 0) {
    warn(`${finalNullWsRoles} WorkspaceMember rows still have null roleId — investigate!`);
  }
  if (finalNullProjRoles > 0) {
    warn(`${finalNullProjRoles} ProjectMember rows still have null projectRoleId — investigate!`);
  }

  log("  Server boot will now auto-validate permissions via syncPermissions + syncSystemRoles.");
  log("  Run: bun run check-permissions to confirm 0 violations.\n");

  // Cleanup
  await db.$disconnect();
  await pool.end();
  redis.disconnect();
}

// ── Run ───────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error("\n  ❌ Migration failed:", err);
  process.exit(1);
});
