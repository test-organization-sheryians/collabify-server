/**
 * Canonical Redis key builders for the Authorization module.
 *
 * RULE: Every file in checks/, cache/, engine/, and invalidation/ must
 * import keys from this file. Hard-coded key strings are forbidden.
 */
export const keys = {
  // ── Workspace ─────────────────────────────────────────────────────────
  workspaceMember: (wid: string, uid: string) => `auth:ws:${wid}:member:${uid}`,
  workspaceMeta: (wid: string) => `auth:ws:${wid}:meta`,

  // ── Project ───────────────────────────────────────────────────────────
  projectMember: (pid: string, uid: string) => `auth:proj:${pid}:member:${uid}`,
  projectMeta: (pid: string) => `auth:proj:${pid}:meta`,

  // ── Page (collaborative doc) ──────────────────────────────────────────
  pageCollab: (pageId: string, uid: string) =>
    `auth:page:${pageId}:collab:${uid}`,
  pageState: (pageId: string) => `auth:page:${pageId}:state`,

  // ── Board (Whiteboard) ────────────────────────────────────────────────
  boardCollab: (boardId: string, uid: string) =>
    `auth:board:${boardId}:collab:${uid}`,
  boardState: (boardId: string) => `auth:board:${boardId}:state`,

  // ── Chat Channel ──────────────────────────────────────────────────────
  channelMember: (cid: string, uid: string) =>
    `auth:channel:${cid}:member:${uid}`,
  channelState: (cid: string) => `auth:channel:${cid}:state`,

  // ── User ──────────────────────────────────────────────────────────────
  userProfile: (uid: string) => `auth:user:${uid}:profile`,

  // ── Permission cache (two tiers) ──────────────────────────────────────
  /** Unconditional permission — cached at scope level */
  permScope: (
    uid: string,
    res: string,
    action: string,
    scopeType: string,
    scopeId: string
  ) => `perm:${uid}:${res}:${action}:${scopeType}:${scopeId}`,

  /** Conditional permission — cached per specific resource */
  permResource: (
    uid: string,
    res: string,
    action: string,
    resourceId: string
  ) => `perm:${uid}:${res}:${action}:resource:${resourceId}`,

  // ── Supporting ────────────────────────────────────────────────────────
  /** Owner bypass — short TTL (30s) for fast ownership transfer propagation */
  ownerBypass: (wid: string, uid: string) => `owner:${wid}:${uid}`,

  /** User's current role at a given scope */
  roleAtScope: (scopeId: string, uid: string) => `role:${scopeId}:${uid}`,

  /** Role's full permission set — long TTL (30 min) */
  rolePerms: (roleId: string) => `roleperms:${roleId}`,

  /** Secondary index: per-user set of all cached perm keys — no TTL, manually managed */
  permIndex: (uid: string) => `perm-index:${uid}`,

  /** Role-member index for bulk invalidation — no DB join needed on role permission change */
  roleMembersIndex: (roleId: string) => `role-members:${roleId}`,
} as const;
