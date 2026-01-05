export const RESERVED_SLUGS = [
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "dashboard",
  "docs",
  "help",
  "login",
  "logout",
  "pricing",
  "privacy",
  "register",
  "settings",
  "signin",
  "signup",
  "status",
  "support",
  "terms",
  "test",
  "www",
] as const;

export const WORKSPACE_LIMITS = {
  // Max workspaces a user can own in this phase
  MAX_OWNED_WORKSPACES: 10,

  // Rate limits for availability checks (transient anti-abuse)
  CHECK_AVAILABILITY_RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_SECONDS: 60,
  },
} as const;
