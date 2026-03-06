// Export Core API
export { typeDefs } from "./api/graphql/type-defs";
export { resolvers } from "./api/graphql/resolvers";

// Engine
export * from "./engine/bootstrap";

export const NotificationModule = {
  startEngine: async () => {
    const { startEngine } = await import("./engine/bootstrap.js");
    return startEngine();
  },
};
