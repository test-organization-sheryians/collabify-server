/** 5 minutes — workspace/project membership and unconditional permissions */
export const MEMBERSHIP_TTL = 5 * 60;

/** 5 minutes — user's role at a given scope */
export const ROLE_TTL = 5 * 60;

/** 30 minutes — role's full permission set (roles change rarely) */
export const ROLEPERMS_TTL = 30 * 60;

/** 30 minutes — user public profile */
export const USER_PROFILE_TTL = 30 * 60;

/** 30 seconds — resource state (isLocked, isArchived) — changes frequently */
export const RESOURCE_STATE_TTL = 30;

/** 5 minutes — unconditional permission results at scope level */
export const PERM_SCOPE_TTL = 5 * 60;

/** 2 minutes — conditional permission results at resource level */
export const PERM_RESOURCE_TTL = 2 * 60;

/** 30 seconds — owner bypass — must propagate quickly after ownership transfer */
export const OWNER_BYPASS_TTL = 30;
