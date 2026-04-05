/**
 * backfill-project-plugins.ts
 *
 * One-time idempotent migration: inserts ProjectPlugin rows for every existing
 * project that does not yet have them. All 5 core plugins are activated by default.
 *
 * Safe to run multiple times — uses INSERT ... ON CONFLICT DO NOTHING.
 *
 * Run: bun run scripts/db/backfill-project-plugins.ts
 *   or: bun run db:backfill:plugins
 */
import { Pool } from "pg";

const ALL_PLUGIN_TYPES = ["CHAT", "WHITEBOARD", "PAGES", "VAULT", "ISSUES"] as const;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  console.log("🔄 Starting ProjectPlugin backfill...\n");

  // Fetch all non-deleted project IDs
  const { rows: projects } = await pool.query<{ id: string }>(
    `SELECT id FROM projects WHERE deleted_at IS NULL ORDER BY created_at`
  );

  console.log(`Found ${projects.length} active projects to backfill.`);

  let totalInserted = 0;

  for (const project of projects) {
    for (const type of ALL_PLUGIN_TYPES) {
      const result = await pool.query(
        `INSERT INTO project_plugins (project_id, type, is_system, settings)
         VALUES ($1, $2::"PluginType", false, NULL)
         ON CONFLICT (project_id, type) DO NOTHING`,
        [project.id, type]
      );
      totalInserted += result.rowCount ?? 0;
    }
  }

  console.log(`\n✨ Backfill complete — inserted ${totalInserted} new project_plugins rows.`);

  await pool.end();
}

main().catch((err) => {
  console.error("❌ backfill-project-plugins failed:", err);
  process.exit(1);
});
