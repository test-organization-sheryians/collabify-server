export type Scope = { type: string; id: string };

export const createLockKeys = (entity: string, scope?: Scope) => {
  const prefix = scope
    ? `lock:${scope.type}:${scope.id}:${entity}`
    : `lock:${entity}`;

  const scopeSuffix = scope ? `${scope.type}:${scope.id}` : `global`;

  return {
    resource: (id: string) => `${prefix}:${id}`,

    exists: (id: string) => {
      // workspace:exists:slug
      // project:exists:ws_123:slug
      const scopePart = scope ? `${scope.id}:` : "";
      return `${entity}:exists:${scopePart}${id}`;
    },

    userReservation: (userId: string) =>
      `user:reservation:${userId}:${scopeSuffix}`,

    rateLimit: (userId: string) => `ratelimit:${entity}:check:${userId}`,
  };
};

// Deprecate old object if needed, but we overwrite the file so it's clean.
// Legacy export removed.
