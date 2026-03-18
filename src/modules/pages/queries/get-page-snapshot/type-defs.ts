export const typeDefs = /* GraphQL */ `
  """
  Returned by getPageSnapshot.

  snapshot         — base64 Y.js diff. Client calls Y.applyUpdate(localDoc, decode(snapshot)).
  lastStreamId     — client passes this to subscribe-page for gap-fill replay.
  snapshotTimestamp — when the base snapshot was last compacted by the stream worker. Null for new pages.
  """
  type PageSnapshot {
    snapshot: String!
    lastStreamId: String!
    snapshotTimestamp: DateTime
  }

  extend type Query {
    """
    Returns the authoritative Y.Doc snapshot diff + a stream cursor for gap-fill.

    First open (no offline state):
      getPageSnapshot(pageId: "cuid")

    Reconnect with offline edits:
      getPageSnapshot(pageId: "cuid", clientSnapshot: "<base64 Y.encodeStateAsUpdate>")

    Client workflow:
      1. Call this query → receive { snapshot, lastStreamId }
      2. Apply snapshot: Y.applyUpdate(localDoc, base64Decode(snapshot))
      3. Open WS: page:subscribe-page { pageId, lastStreamId }  ← gap-fill
    """
    getPageSnapshot(pageId: ID!): PageSnapshot!
  }
`;
