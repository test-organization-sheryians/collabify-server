/**
 * Types for get-active-page-collaborators query.
 *
 * NOTE: role is always "VIEWER" — the Redis presence ZSET stores only userId,
 * not role. Role is intentionally omitted from the live-presence response to
 * avoid a per-user DB lookup on every presence poll. If role is needed, join
 * client-side with getPageCollaborators (authoritative DB list).
 */

export interface ActiveCollaboratorUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface ActiveCollaborator {
  userId: string;
  /** Always "VIEWER" — presence ZSET does not carry role information. */
  role: "VIEWER";
  /** ISO string — snapshot of Date.now() at query time, not the real join time. */
  joinedAt: string;
  user: ActiveCollaboratorUser;
}
