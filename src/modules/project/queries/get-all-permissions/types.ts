/**
 * TS return/row types for the getAllPermissions query.
 * No Zod imports — pure TypeScript only.
 */

/** A single Permission row returned to the client. */
export interface PermissionRow {
  id: string;
  resource: string;
  action: string;
  description: string | null;
  module: string;
}

/** Handler return type. */
export type GetAllPermissionsResult = PermissionRow[];
