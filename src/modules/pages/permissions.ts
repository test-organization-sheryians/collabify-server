/**
 * Pages module — permission manifest.
 */
export const PAGE_PERMISSIONS = [
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
    description: "Edit page content / rename",
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
    description: "Archive / unarchive a page",
    hasConditions: false,
  },
  {
    resource: "page",
    action: "lock",
    module: "pages",
    description: "Lock / unlock a page",
    hasConditions: false,
  },
  // Collaborators
  {
    resource: "page.collaborator",
    action: "read",
    module: "pages",
    description: "List page collaborators",
    hasConditions: false,
  },
  {
    resource: "page.collaborator",
    action: "add",
    module: "pages",
    description: "Add a page collaborator",
    hasConditions: false,
  },
  {
    resource: "page.collaborator",
    action: "remove",
    module: "pages",
    description: "Remove a page collaborator",
    hasConditions: false,
  },
] as const;
