export * from "./mark-notification-read";
export * from "./mark-all-notifications-read";
// Note: typeDefs are exported but collisions might occur if consuming * from here.
// However, the error said "Module has already exported...".
// This means mark-notification-read exports typeDefs, and mark-all.. also exports typeDefs.
// 'export *' from both causes a conflict in the index file itself if it tries to merge them.
// TypeScript doesn't allow exporting two 'typeDefs'.
// I MUST NOT export typeDefs from here.
