#!/usr/bin/env bun
/**
 * sync-permissions.ts
 *
 * Reads all module permission manifests → generates:
 *   1. server/src/modules/authorization/types/app-permissions.ts
 *   2. client/src/shared/lib/auth/app-permission.ts
 *
 * Also validates:
 *   - No dot notation in any resource field
 *   - All permissions.assert("...") strings in server handlers exist in manifests
 *   - All <Guard permission="..."> and usePermission("...") in client exist in manifests
 *
 * Usage:
 *   bun run scripts/sync-permissions.ts          # generate + validate
 *   bun run scripts/sync-permissions.ts --check  # validate only (no write)
 *
 * Exit codes:
 *   0 — success
 *   1 — violations found (CI-safe: fail the build)
 */

import { WORKSPACE_PERMISSIONS } from '../src/modules/workspace/permissions'
import { PROJECT_PERMISSIONS }   from '../src/modules/project/permissions'
import { ISSUE_PERMISSIONS }     from '../src/modules/issues/permissions'
import { PAGE_PERMISSIONS }      from '../src/modules/pages/permissions'
import { BOARD_PERMISSIONS }     from '../src/modules/whiteboard/permissions'
import { CHAT_PERMISSIONS }      from '../src/modules/chat/permissions'
import { VAULT_PERMISSIONS }     from '../src/modules/vault/permissions'

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const CHECK_ONLY = process.argv.includes('--check')
// @ts-ignore — Bun-specific; VS Code resolves root tsconfig (CommonJS) instead of scripts/tsconfig.json (ESNext)
const ROOT       = resolve(import.meta.dir, '..')
const CLIENT_ROOT = resolve(ROOT, '../client')

const SERVER_OUT = join(ROOT, 'src/modules/authorization/types/app-permissions.ts')
const CLIENT_OUT = join(CLIENT_ROOT, 'src/shared/lib/auth/app-permission.ts')

// ─────────────────────────────────────────────────────────────────────────────
// 1. Build canonical permission set
// ─────────────────────────────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  ...WORKSPACE_PERMISSIONS,
  ...PROJECT_PERMISSIONS,
  ...ISSUE_PERMISSIONS,
  ...PAGE_PERMISSIONS,
  ...BOARD_PERMISSIONS,
  ...CHAT_PERMISSIONS,
  ...VAULT_PERMISSIONS,
] as const

type RawPerm = { resource: string; action: string; module: string; description: string }

const allPerms = ALL_PERMISSIONS as unknown as RawPerm[]
const permStrings = allPerms.map(p => `${p.resource}:${p.action}`)
const permSet     = new Set(permStrings)

let violations = 0

function fail(msg: string) {
  console.error(`  ❌ ${msg}`)
  violations++
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Validate: no dot notation in resource fields
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔎 Checking for dot-notation violations in manifests...')
const dotViolations = allPerms.filter(p => p.resource.includes('.'))
if (dotViolations.length > 0) {
  for (const p of dotViolations) {
    fail(`DOT NOTATION in module="${p.module}": resource="${p.resource}" — change dots to colons`)
  }
} else {
  console.log('  ✅ No dot-notation violations in manifests')
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Validate: no duplicate permission strings
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔎 Checking for duplicate permission strings...')
const seen = new Set<string>()
for (const p of allPerms) {
  const key = `${p.resource}:${p.action}`
  if (seen.has(key)) {
    fail(`DUPLICATE permission: "${key}" (module="${p.module}")`)
  }
  seen.add(key)
}
if (violations === 0) console.log('  ✅ No duplicates')

// ─────────────────────────────────────────────────────────────────────────────
// 4. Scan server handlers for stale permission strings
// ─────────────────────────────────────────────────────────────────────────────

import { glob } from 'glob'

console.log('\n🔎 Scanning server handlers for unknown permission strings...')
// @ts-ignore — top-level await is valid in Bun ESM scripts
const serverFiles = await glob('src/**/*.ts', {
  cwd: ROOT,
  ignore: [
    '**/node_modules/**',
    '**/*.test.ts',
    '**/permissions.ts',
    '**/app-permissions.ts',
    '**/seed-auth.ts',
    '**/sync-permissions.ts',
  ],
})

let serverHandlerViolations = 0
for (const file of serverFiles) {
  const content = readFileSync(join(ROOT, file), 'utf-8')
  // Only match actual code calls — skip lines that are comments (start with * or //)
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trimStart()
    // Skip comment lines
    if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue
    const matches = [...line.matchAll(/permissions\.(?:assert|can)\(\s*["']([^"']+)["']/g)]
    for (const match of matches) {
      const perm = match[1]
      if (!permSet.has(perm)) {
        fail(`STALE HANDLER PERMISSION in ${file}: "${perm}" is not in any manifest`)
        serverHandlerViolations++
      }
    }
  }
}
if (serverHandlerViolations === 0) console.log('  ✅ All server handler permission strings are valid')

// ─────────────────────────────────────────────────────────────────────────────
// 5. Scan client Guard + usePermission calls
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🔎 Scanning client Guards and usePermission calls...')
let clientViolations = 0

if (existsSync(CLIENT_ROOT)) {
  // @ts-ignore — top-level await is valid in Bun ESM scripts
  const clientFiles = await glob('src/**/*.{ts,tsx}', {
    cwd: CLIENT_ROOT,
    ignore: ['**/node_modules/**', '**/app-permission.ts'],
  })

  for (const file of clientFiles) {
    const content = readFileSync(join(CLIENT_ROOT, file), 'utf-8')
    const guardMatches = [...content.matchAll(/permission=["']([^"']+)["']/g)]
    const hookMatches  = [...content.matchAll(/usePermission\(\s*["']([^"']+)["']/g)]
    for (const match of [...guardMatches, ...hookMatches]) {
      const perm = match[1]
      if (!permSet.has(perm)) {
        fail(`UNKNOWN GUARD/HOOK PERMISSION in ${file}: "${perm}" is not in any manifest`)
        clientViolations++
      }
    }
  }
  if (clientViolations === 0) console.log('  ✅ All client Guard and usePermission strings are valid')
} else {
  console.warn('  ⚠️  Client directory not found — skipping client validation')
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Generate TypeScript type files
// ─────────────────────────────────────────────────────────────────────────────

if (violations > 0) {
  console.error(`\n💥 ${violations} violation(s) found. Fix them before generating types.\n`)
  process.exit(1)
}

if (CHECK_ONLY) {
  console.log('\n✅ --check mode: validation passed. No files written.\n')
  process.exit(0)
}

console.log('\n📝 Generating type files...')

// Group permissions by module for readability
const byModule: Record<string, RawPerm[]> = {}
for (const p of allPerms) {
  if (!byModule[p.module]) byModule[p.module] = []
  byModule[p.module].push(p)
}

function buildUnionBlock(perms: RawPerm[]): string {
  return perms.map(p => `  | "${p.resource}:${p.action}"`).join('\n')
}

function buildScopeMappingBlock(perms: RawPerm[]): string {
  return perms.map(p => {
    let scopes: string;
    const perm = `${p.resource}:${p.action}`;

    switch (p.module) {
      case "workspace":
        scopes = "WorkspaceScope";
        break;
      case "project":
        scopes = (perm === "project:create" || perm === "project:read") 
          ? "WorkspaceScope | ProjectScope" 
          : "ProjectScope";
        break;
      case "chat":
        if (perm === "chat:channel:read") {
          scopes = "WorkspaceScope | ProjectScope";
        } else {
          scopes = perm.startsWith("chat:channel:") 
            ? "ProjectScope" 
            : "WorkspaceScope | ProjectScope";
        }
        break;
      case "issues":
      case "pages":
      case "whiteboard":
        scopes = "WorkspaceScope | ProjectScope | ResourceScope";
        break;
      case "vault":
      default:
        scopes = "WorkspaceScope | ProjectScope | ResourceScope";
        break;
    }

    return `  "${perm}": ${scopes};`;
  }).join('\n');
}

const now = new Date().toISOString().split('T')[0]

const serverFileContent = `/**
 * app-permissions.ts — Canonical AppPermission union type.
 *
 * GENERATED FILE — DO NOT EDIT MANUALLY.
 * Run: bun run scripts/sync-permissions.ts
 *
 * Source: server/src/modules/[module]/permissions.ts
 * Last generated: ${now}
 */

import type { WorkspaceScope, ProjectScope, ResourceScope } from "./permission-types";

// Workspace
type WorkspacePermission =\n${buildUnionBlock(byModule['workspace'] ?? [])}

// Project
type ProjectPermission =\n${buildUnionBlock(byModule['project'] ?? [])}

// Issues
type IssuePermission =\n${buildUnionBlock(byModule['issues'] ?? [])}

// Pages
type PagePermission =\n${buildUnionBlock(byModule['pages'] ?? [])}

// Whiteboard
type BoardPermission =\n${buildUnionBlock(byModule['whiteboard'] ?? [])}

// Chat
type ChatPermission =\n${buildUnionBlock(byModule['chat'] ?? [])}

// Vault
type VaultPermission =\n${buildUnionBlock(byModule['vault'] ?? [])}

/**
 * AppPermission — complete union of all granular permissions in the system.
 * Used for compile-time safety on all permission.assert() calls.
 */
export type AppPermission =
  | WorkspacePermission
  | ProjectPermission
  | IssuePermission
  | PagePermission
  | BoardPermission
  | ChatPermission
  | VaultPermission;

/**
 * PermissionScopeMap — maps every specific permission to its valid scope payloads.
 * Exclusively generated to strictly enforce bounds in PermissionEngine.
 */
export interface PermissionScopeMap {
  // Workspace
${buildScopeMappingBlock(byModule['workspace'] ?? [])}

  // Project
${buildScopeMappingBlock(byModule['project'] ?? [])}

  // Issues
${buildScopeMappingBlock(byModule['issues'] ?? [])}

  // Pages
${buildScopeMappingBlock(byModule['pages'] ?? [])}

  // Whiteboard
${buildScopeMappingBlock(byModule['whiteboard'] ?? [])}

  // Chat
${buildScopeMappingBlock(byModule['chat'] ?? [])}

  // Vault
${buildScopeMappingBlock(byModule['vault'] ?? [])}
}
`

const clientFileContent = `/**
 * app-permission.ts — Client-side AppPermission union type.
 *
 * GENERATED FILE — DO NOT EDIT MANUALLY.
 * Run: cd server && bun run scripts/sync-permissions.ts
 *
 * Mirror of: server/src/modules/authorization/types/app-permissions.ts
 * Used by Guard and usePermission for compile-time safety.
 *
 * Last generated: ${now}
 */

// Workspace
type WorkspacePermission =\n${buildUnionBlock(byModule['workspace'] ?? [])}

// Project
type ProjectPermission =\n${buildUnionBlock(byModule['project'] ?? [])}

// Issues
type IssuePermission =\n${buildUnionBlock(byModule['issues'] ?? [])}

// Pages
type PagePermission =\n${buildUnionBlock(byModule['pages'] ?? [])}

// Whiteboard
type BoardPermission =\n${buildUnionBlock(byModule['whiteboard'] ?? [])}

// Chat
type ChatPermission =\n${buildUnionBlock(byModule['chat'] ?? [])}

// Vault
type VaultPermission =\n${buildUnionBlock(byModule['vault'] ?? [])}

/**
 * AppPermission — complete union of all granular permissions.
 * Use this type with Guard and usePermission.
 */
export type AppPermission =
  | WorkspacePermission
  | ProjectPermission
  | IssuePermission
  | PagePermission
  | BoardPermission
  | ChatPermission
  | VaultPermission
`

writeFileSync(SERVER_OUT, serverFileContent)
console.log(`  ✅ Wrote ${SERVER_OUT}`)

if (existsSync(CLIENT_ROOT)) {
  writeFileSync(CLIENT_OUT, clientFileContent)
  console.log(`  ✅ Wrote ${CLIENT_OUT}`)
}

console.log(`\n✅ Sync complete — ${permSet.size} permissions registered.\n`)
