export const typeDefs = /* GraphQL */ `
  extend type Query {
    """
    Returns the current authoritative Y.Doc snapshot + lastStreamId for gap-fill.

    If 'clientSnapshot' is provided, the server merges it (offline sync) and writes
    the client's delta back to the Redis stream before returning.

    Called once on page open. After this, the client switches to WS stream consumption.
    """
    getPageSnapshot(pageId: ID!, clientSnapshot: String): GetPageSnapshotResult!
  }
`;
