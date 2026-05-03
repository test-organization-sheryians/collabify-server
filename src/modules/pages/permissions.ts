/**
 * Pages module — permission manifest.
 *
 * Convention: resource uses COLON-separated hierarchy (no dots).
 * Permission string = `${resource}:${action}`
 *
 * @example "page:create", "page:lock", "page:collaborator:add"
 */
export const PAGE_PERMISSIONS = [
  // ── Core page CRUD ───────────────────────────────────────────────────────────
  {
    resource: "page",
    action: "create",
    module: "pages",
    description: "Create a page",
    hasConditions: false,
  },
  {
    resource: "page",
    action: "read",
    module: "pages",
    description: "View a page",
    hasConditions: false,
  },
  {
    resource: "page",
    action: "update",
    module: "pages",
    description: "Edit page content or rename",
    hasConditions: false,
  },
  {
    resource: "page",
    action: "delete",
    module: "pages",
    description: "Delete a page",
    hasConditions: false,
  },
  {
    resource: "page",
    action: "archive",
    module: "pages",
    description: "Archive or unarchive a page",
    hasConditions: false,
  },
  {
    resource: "page",
    action: "lock",
    module: "pages",
    description: "Lock or unlock a page to prevent edits",
    hasConditions: false,
  },
  {
    resource: "page",
    action: "share",
    module: "pages",
    description: "Manage page collaborators and sharing",
    hasConditions: false,
  },
  // ── Collaborators ────────────────────────────────────────────────────────────
  {
    resource: "page:collaborator",
    action: "read",
    module: "pages",
    description: "List page collaborators",
    hasConditions: false,
  },
  {
    resource: "page:collaborator",
    action: "add",
    module: "pages",
    description: "Add a page collaborator",
    hasConditions: false,
  },
  {
    resource: "page:collaborator",
    action: "remove",
    module: "pages",
    description: "Remove a page collaborator",
    hasConditions: false,
  },
] as const;
