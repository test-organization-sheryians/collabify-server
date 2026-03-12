/**
 * Authorization module — public API surface.
 *
 * RULE: All imports from other modules must go through this file.
 * Deep imports (e.g. from checks/*, engine/*) are forbidden outside this module.
 */

// ── Core classes ──────────────────────────────────────────────────────────────
export { AuthGate } from "./auth-gate/auth-gate";
export { PermissionEngine } from "./engine/permission-engine";
export { Invalidator } from "./invalidation/invalidator";

// ── Session warmer ────────────────────────────────────────────────────────────
export {
  warmWorkspaceSession,
  warmWSSession,
} from "./auth-gate/session-warmer";

// ── Context factories ─────────────────────────────────────────────────────────
export { createGraphQLAuthContext } from "./context/graphql-context";
export { createWSAuthContext } from "./context/ws-context";
export type { AuthContext } from "./context/graphql-context";
export type { WSAuthContext } from "./context/ws-context";
export type { AuthExtension } from "./context/types";

// ── Middleware ────────────────────────────────────────────────────────────────
export { assertAuthenticated } from "./middleware/assert-authenticated";
export { assertOwnership } from "./middleware/assert-ownership";

// ── Invalidation utilities ────────────────────────────────────────────────────
export {
  addRoleMember,
  removeRoleMember,
  getRoleMembers,
} from "./invalidation/role-member-index";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  MemberWithRole,
  CachedWorkspace,
  CachedProject,
  CachedPage,
  CachedBoard,
  CachedChannel,
  PublicUser,
  MentionedUser,
} from "./types/auth-gate-types";

export type {
  PermissionScope,
  PermissionResult,
  ConditionContext,
  ConditionBlock,
} from "./types/permission-types";

export type {
  AuthGateInvalidator,
  PermissionCacheInvalidator,
} from "./types/invalidator-types";
