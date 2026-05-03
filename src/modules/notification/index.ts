// Engine bootstrap — all other exports will be rebuilt per implementation plan
export * from "./engine/bootstrap";

// ── GraphQL API (consumed by src/graphql/schema.ts) ──────────────────────────
export { notificationManagementTypeDefs as typeDefs } from "./management/graphql/type-defs";
export { notificationManagementResolvers as resolvers } from "./management/graphql/resolvers";

// ── Dataloaders (consumed by src/graphql/context.ts) ─────────────────────────
export { createNotificationLoaders } from "./dataloaders";
export type { NotificationLoaders } from "./dataloaders";

// ── Preference Seeder (consumed by user.create service) ──────────────────────
export { seedDefaults as seedNotificationDefaults } from "./shared/preferences/preference-seeder";

// ── Module Bootstrap ──────────────────────────────────────────────────────────
export const NotificationModule = {
  startEngine: async () => {
    const { startEngine } = await import("./engine/bootstrap.js");
    return startEngine();
  },
};
