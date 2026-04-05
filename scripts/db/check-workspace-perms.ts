/**
 * check-workspace-perms.ts
 *
 * Diagnostic: checks DB + Redis for roles and permissions of all members
 * in a given workspace slug.
 *
 * Run: bun run scripts/db/check-workspace-perms.ts <workspace-slug>
 *   or: bun run db:check-perms <workspace-slug>
 */
import { db } from "../../src/infra/db";
import { appRedis } from "../../src/infra/redis";

const WORKSPACE_SLUG = process.argv[2];

if (!WORKSPACE_SLUG) {
  console.error("❌ Usage: bun run scripts/db/check-workspace-perms.ts <workspace-slug>");
  process.exit(1);
}

async function main() {
  // ── 1. Resolve workspace ───────────────────────────────────────────────────
  const workspace = await db.workspace.findUnique({
    where: { slug: WORKSPACE_SLUG },
    select: { id: true, name: true, slug: true },
  });

  if (!workspace) {
    console.log(`❌ Workspace '${WORKSPACE_SLUG}' not found`);
    return;
  }
  console.log(`\n✅ Workspace: "${workspace.name}"  slug=${workspace.slug}`);
  console.log(`   id: ${workspace.id}\n`);

  // ── 2. Load members + roles + permissions ──────────────────────────────────
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    select: {
      userId: true,
      user: { select: { fullName: true, email: true } },
      assignedRole: {
        select: {
          id: true,
          name: true,
          rank: true,
          permissions: {
            where: { effect: "ALLOW" },
            select: {
              permission: { select: { resource: true, action: true } },
            },
          },
        },
      },
    },
    orderBy: { assignedRole: { rank: "desc" } },
  });

  console.log(`👥  Members found: ${members.length}\n${"─".repeat(60)}`);

  for (const m of members) {
    const name   = m.user.fullName ?? "Unknown";
    const email  = m.user.email ?? "—";
    const role   = m.assignedRole?.name ?? "none";
    const rank   = m.assignedRole?.rank ?? "?";
    const roleId = m.assignedRole?.id ?? "—";

    const perms = (m.assignedRole?.permissions ?? [])
      .map((p) => `${p.permission.resource}:${p.permission.action}`)
      .sort();

    console.log(`\n  👤 ${name}  <${email}>`);
    console.log(`     Role     : ${role}  (rank=${rank})`);
    console.log(`     Role ID  : ${roleId}`);
    console.log(`     DB perms : ${perms.length} total`);

    if (perms.length) {
      for (const p of perms) {
        console.log(`       · ${p}`);
      }
    }

    // ── 3. Check Redis cache for granted-perms ────────────────────────────
    const cacheKey = `granted-perms:${m.userId}:${workspace.id}`;
    const cached = await appRedis.smembers(cacheKey);

    if (cached.length > 0) {
      console.log(`\n     Redis cache key  : ${cacheKey}`);
      console.log(`     Cached perms     : ${cached.length} total`);
      if (cached.length <= 20) {
        for (const cp of cached.sort()) {
          console.log(`       · ${cp}`);
        }
      }
    } else {
      console.log(`\n     Redis cache key  : ${cacheKey}`);
      console.log(`     Redis cache      : ⚠️  EMPTY (will resolve from DB on next request)`);
    }

    // ── 4. Check owner-bypass key ─────────────────────────────────────────
    const ownerKey = `owner-bypass:${workspace.id}:${m.userId}`;
    const ownerBypass = await appRedis.get(ownerKey);
    console.log(`     Owner bypass key : ${ownerKey} → ${ownerBypass === "1" ? "✅ BYPASSED (OWNER)" : ownerBypass === "0" ? "❌ NOT bypassed" : "⚠️  Not cached"}`);
  }

  console.log(`\n${"─".repeat(60)}\n✅ Done\n`);
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    appRedis.disconnect();
  });
