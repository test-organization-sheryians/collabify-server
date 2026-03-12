import type { AuthGate } from "../auth-gate/auth-gate";
import type { PermissionEngine } from "../engine/permission-engine";

/**
 * Extends ServiceContext and WSHandlerContext with auth and permissions.
 * Import these in graphql/types.ts to update the shared context interfaces.
 */
export interface AuthExtension {
  auth: AuthGate;
  permissions: PermissionEngine;
}
