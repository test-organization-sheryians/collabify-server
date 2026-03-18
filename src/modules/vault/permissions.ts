/**
 * Vault module — permission manifest.
 */
export const VAULT_PERMISSIONS = [
  {
    resource: "vault",
    action: "read",
    module: "vault",
    description: "Browse vault files and folders",
    hasConditions: false,
  },
  {
    resource: "vault",
    action: "write",
    module: "vault",
    description: "Create and rename folders",
    hasConditions: false,
  },
  {
    resource: "vault",
    action: "upload",
    module: "vault",
    description: "Upload files to vault",
    hasConditions: false,
  },
  {
    resource: "vault",
    action: "delete",
    module: "vault",
    description: "Delete files or folders",
    hasConditions: false,
  },
  {
    resource: "vault",
    action: "move",
    module: "vault",
    description: "Move files or folders",
    hasConditions: false,
  },
  {
    resource: "vault",
    action: "pin",
    module: "vault",
    description: "Pin / unpin folders",
    hasConditions: false,
  },
] as const;
