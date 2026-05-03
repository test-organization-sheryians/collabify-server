/**
 * Vault module — permission manifest.
 *
 * Convention: resource uses COLON-separated hierarchy (no dots).
 * Permission string = `${resource}:${action}`
 *
 * @example "vault:file:upload", "vault:folder:create", "vault:quota:view"
 */
export const VAULT_PERMISSIONS = [
  // ── Broad access ─────────────────────────────────────────────────────────────
  {
    resource: "vault",
    action: "read",
    module: "vault",
    description: "Browse and read vault structure (required for all vault queries)",
    hasConditions: false,
  },
  // ── Files ────────────────────────────────────────────────────────────────────
  {
    resource: "vault:file",
    action: "upload",
    module: "vault",
    description: "Upload files to the vault",
    hasConditions: false,
  },
  {
    resource: "vault:file",
    action: "download",
    module: "vault",
    description: "Download files from the vault",
    hasConditions: false,
  },
  {
    resource: "vault:file",
    action: "rename",
    module: "vault",
    description: "Rename a file in the vault",
    hasConditions: false,
  },
  {
    resource: "vault:file",
    action: "delete",
    module: "vault",
    description: "Delete a file from the vault",
    hasConditions: false,
  },
  {
    resource: "vault:file",
    action: "move",
    module: "vault",
    description: "Move a file to a different folder",
    hasConditions: false,
  },
  // ── Folders ──────────────────────────────────────────────────────────────────
  {
    resource: "vault:folder",
    action: "create",
    module: "vault",
    description: "Create a folder in the vault",
    hasConditions: false,
  },
  {
    resource: "vault:folder",
    action: "rename",
    module: "vault",
    description: "Rename a vault folder",
    hasConditions: false,
  },
  {
    resource: "vault:folder",
    action: "delete",
    module: "vault",
    description: "Delete a vault folder and its contents",
    hasConditions: false,
  },
  {
    resource: "vault:folder",
    action: "pin",
    module: "vault",
    description: "Pin or unpin a folder in the sidebar",
    hasConditions: false,
  },
  // ── Quota ────────────────────────────────────────────────────────────────────
  {
    resource: "vault:quota",
    action: "view",
    module: "vault",
    description: "View vault storage usage and quota",
    hasConditions: false,
  },
] as const;
