/**
 * index.ts — Master seed entrypoint
 *
 * Runs both seed scripts in sequence:
 *   1. seed-permissions — upserts all Permission rows from the manifest
 *   2. seed-auth        — seeds system roles + assigns permissions for all workspaces
 *
 * Usage:
 *   bun run db:seed          (registered in package.json prisma.seed)
 *   bun run prisma/seeds/index.ts
 */
import { execSync } from "child_process";
import { resolve } from "path";

const SEEDS = ["seed-permissions.ts", "seed-auth.ts"];

const seedsDir = resolve(__dirname);

console.log("🌱 Running database seeds...\n");

for (const seed of SEEDS) {
  const filePath = resolve(seedsDir, seed);
  console.log(`\n▶ Running: ${seed}`);
  try {
    execSync(`bun run ${filePath}`, { stdio: "inherit" });
  } catch (err) {
    console.error(`\n❌ Seed failed: ${seed}`);
    process.exit(1);
  }
}

console.log("\n✅ All seeds complete.");

