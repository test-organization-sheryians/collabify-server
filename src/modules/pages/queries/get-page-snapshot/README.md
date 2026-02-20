# get-page-snapshot — Query Handler System Design

## Overview

**GraphQL query:** `getPageSnapshot(pageId: ID!, clientSnapshot: String): PageSnapshot`  
**File:** `server/src/modules/pages/queries/get-page-snapshot/handler.ts`

Called **once per page open**. Returns a Yjs binary diff the client applies to hydrate its local Y.Doc.

### Input

| Field            | Type     | Required     | When                                      |
| ---------------- | -------- | ------------ | ----------------------------------------- |
| `pageId`         | `ID!`    | Always       | Every call                                |
| `clientSnapshot` | `String` | **Optional** | Reconnect only — client has offline edits |

**First open:** send only `pageId`. No clientSnapshot because client has no prior state.  
**Reconnect:** send `pageId` + `clientSnapshot: base64(Y.encodeStateAsUpdate(localDoc))`.

### Output (`PageSnapshot`)

| Field               | Type       | Notes                                                         |
| ------------------- | ---------- | ------------------------------------------------------------- |
| `snapshot`          | `String!`  | base64 Yjs diff — `Y.applyUpdate(localDoc, decode(snapshot))` |
| `lastStreamId`      | `String!`  | pass to `subscribe-page` for gap-fill replay                  |
| `snapshotTimestamp` | `DateTime` | last stream worker compaction time. Null for new pages        |

> `pageId` is **not** included in the response — client already knows which page it opened.

---

## Position in the 5-Phase Sync Lifecycle

```
User opens page → usePageSync orchestrator:

Phase 1: useServerSync ← CALLS getPageSnapshot
         ├─ encode local ydoc → base64 (clientSnapshot)
         ├─ query getPageSnapshot(pageId, clientSnapshot)
         ├─ receive: { snapshot (diff), lastStreamId }
         ├─ safeApplyUpdate(ydoc, diff, origin: Remote)
         └─ captures lastStreamId for Phase 4

Phase 4: useNetworkSync
         └─ wsManager.emit('page:subscribe-page', { pageId, lastStreamId })
              (gap-fill from lastStreamId → latest)
```

**Key contract:** `lastStreamId` links these two phases. The subscribe handler replays `XRANGE (lastStreamId, +]` to close the window between snapshot fetch and WS subscription.

---

## Architecture — Redis-First with S3 Fallback

```
getPageSnapshot(pageId, clientSnapshot?)
      │
      ├─ 1. AUTH
      │    db.page.findFirst({ OR: [createdBy | collaborators.some(userId)], deletedAt: null })
      │    → 403 FORBIDDEN if not found / no access
      │    → captures: page.s3Key, page.lastSnapshotStreamId, page.lastSnapshotAt
      │
      ├─ 2. LOAD BASE SNAPSHOT
      │    ┌─ REDIS HIT (fast path, <10ms):
      │    │    ctx.redis.getBuffer(PageKeys.PageSnapshotLatest(pageId))
      │    │    → snapshotBinary: Buffer (raw Yjs bytes, no JSON wrapper)
      │    │    → snapshotStreamId = page.lastSnapshotStreamId || '0-0'
      │    │
      │    ├─ REDIS MISS → S3 FALLBACK (~100ms):
      │    │    downloadPageSnapshot(page.s3Key) with 10s timeout
      │    │    → if null (NoSuchKey): treat as new page (fall to empty)
      │    │    → warm Redis: ctx.redis.setex(snapshotKey, PageTTLs.SNAPSHOT_REDIS, binary)
      │    │
      │    └─ NO s3Key (brand new page, never written):
      │         new Y.Doc({ guid: pageId })
      │         Y.encodeStateAsUpdate(emptyDoc) → return early
      │         (no stream, no diff needed, lastStreamId = '0-0')
      │
      ├─ 3. APPLY STREAM DELTA (worker lag window)
      │
      │    tempDoc = new Y.Doc({ guid: pageId })  ← DETERMINISTIC GUID
      │    Y.applyUpdate(tempDoc, snapshotBinary)
      │
      │    XRANGE page:{pageId}:stream
      │           (snapshotStreamId, +]           ← exclusive start (don't re-apply base)
      │           COUNT 5000
      │    for each entry:
      │      safeApplyUpdate(tempDoc, entry, non-fatal)
      │      → lastStreamId = id  (tracks furthest applied entry)
      │
      │    WHY: Stream worker compacts the stream every ~50 updates (threshold).
      │    In the window between compaction and this query, new XADD entries exist
      │    but aren't in the snapshot yet. This step closes that gap.
      │
      ├─ 4. BIDIRECTIONAL SYNC (only if clientSnapshot provided)
      │
      │    clientDoc = new Y.Doc({ guid: pageId })
      │    Y.applyUpdate(clientDoc, base64Decode(clientSnapshot))
      │
      │    serverVector = Y.encodeStateVector(tempDoc)
      │    clientToServerDiff = Y.encodeStateAsUpdate(clientDoc, serverVector)
      │                         ← "what client has that server doesn't"
      │
      │    if clientToServerDiff.length > 0:
      │      safeApplyUpdate(tempDoc, clientToServerDiff, throwOnError: true)
      │
      │      CLIENT_SYNC_SCRIPT (Lua atomic, 1 RTT):
      │        KEYS[1] = page:{pageId}:stream
      │        KEYS[2] = page:{pageId}:dedupe:{dedupeId}
      │        ARGV[1] = PageTTLs.DEDUPE (60)
      │        ARGV[2] = base64(clientToServerDiff)
      │        ARGV[3] = pageId
      │        ARGV[4] = userId
      │        ARGV[5] = dedupeId ('client-sync-{userId}-{timestamp}')
      │        ARGV[6] = maxStreamLen (50_000)
      │        Returns: [ok: '1'|'0', streamId: string, status: 'ok'|'duplicate'|'backpressure']
      │
      │      if ok='1':
      │        PUBLISH page:{pageId}:events JSON {
      │          message: createSuccessFrame('page:page-update', { pageId, streamId, update, userId }),
      │          originSocketId: null   ← broadcast to ALL instances (other devices of same user)
      │        }
      │
      │    clientDoc.destroy()
      │
      ├─ 5. COMPUTE SERVER→CLIENT DIFF
      │
      │    clientStateVector = Y.encodeStateVector(clientDoc)
      │                        (derived again from clientSnapshot)
      │    diff = Y.encodeStateAsUpdate(tempDoc, clientStateVector)
      │           ← "what server has that client doesn't" (bandwidth-optimized)
      │    tempDoc.destroy()
      │
      └─ 6. RETURN
           {
             pageId,
             snapshot: base64(diff),    ← client applies via Y.applyUpdate
             lastStreamId,              ← used by subscribe-page for gap-fill
             snapshotTimestamp: page.lastSnapshotAt
           }
```

---

## Pages vs Whiteboard — Key Differences

| Concern               | Whiteboard                                     | Pages                                                    |
| --------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Redis snapshot format | JSON `{ snapshot: base64, streamId, version }` | Raw `Buffer` (binary, no wrapper)                        |
| Redis key             | `WhiteboardKeys.SnapshotLatest(id)`            | `PageKeys.PageSnapshotLatest(id)`                        |
| Redis read method     | `ctx.redis.get()` → JSON.parse                 | `ctx.redis.getBuffer()` → raw Buffer                     |
| Cache warm on miss    | JSON wrapper with version/updatedAt            | Raw binary `setex`                                       |
| CLIENT_SYNC_SCRIPT    | Returns JSON string `{ok, streamId, code}`     | Returns flat array `[ok, streamId, status]`              |
| Pub/Sub channel       | `BoardEvents` (1 channel)                      | `PageEvents` (content) — not awareness                   |
| Y.Doc shared type     | `Y.Array` (Excalidraw elements)                | `Y.XmlFragment('content')` (Tiptap)                      |
| S3 download           | `downloadSnapshot(s3Key)`                      | `downloadPageSnapshot(s3Key)` → returns `Buffer \| null` |
| Empty board check     | `!board.s3Key`                                 | `!page.s3Key` (same pattern)                             |

---

## Redis Operations Summary

| Step     | Operation                  | Key                                         | Notes                        |
| -------- | -------------------------- | ------------------------------------------- | ---------------------------- |
| 2 (hit)  | `GETBUFFER`                | `page:{id}:snapshot:latest`                 | Raw binary, <10ms            |
| 2 (miss) | `SETEX`                    | `page:{id}:snapshot:latest`                 | Cache warm after S3 fetch    |
| 3        | `XRANGE`                   | `page:{id}:stream`                          | Worker lag delta, COUNT 5000 |
| 4        | `CLIENT_SYNC_SCRIPT` (Lua) | `page:{id}:stream`, `page:{id}:dedupe:{id}` | Atomic dedup + XADD          |
| 4        | `PUBLISH`                  | `page:{id}:events`                          | Broadcast offline edits      |

---

## CLIENT_SYNC_SCRIPT — Full Signature

```
KEYS[1] = page:{pageId}:stream              ← XADD target
KEYS[2] = page:{pageId}:dedupe:{dedupeId}   ← SETEX dedup marker

ARGV[1] = dedupeTtl     (PageTTLs.DEDUPE = 60)
ARGV[2] = update        (base64-encoded client→server diff)
ARGV[3] = pageId
ARGV[4] = userId
ARGV[5] = dedupeId      ('client-sync-{userId}-{ts}')
ARGV[6] = maxStreamLen  (50_000)

Returns: [ok: '1'|'0', streamId: string, status: 'ok'|'duplicate'|'backpressure']
```

**XADD fields written to stream:**

```
pageId, update (base64), userId, dedupeId, source='client-sync'
```

The `source` field distinguishes client-sync entries from regular page-update entries in logs.

---

## Lua Script: See [`infra/lua/client-sync.ts`](../../infra/lua/client-sync.ts)

Pre-loaded at startup via `loadAllLuaScripts()` in `infra/lua/index.ts`.

---

## Failure Modes

| Failure                              | Handling                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Page not found / auth failed         | `AppError.forbidden()` — 403 to client                                                                    |
| Redis GET fails                      | Falls through to S3 fallback                                                                              |
| S3 download fails / timeout          | `AppError()` — fatal, client retries                                                                      |
| S3 returns null (NoSuchKey)          | Treated as new page → empty doc                                                                           |
| `safeApplyUpdate` fails (delta)      | **Non-fatal** — log, skip that stream entry                                                               |
| `safeApplyUpdate` fails (clientSync) | **Fatal** — throws, bidir sync skipped entirely                                                           |
| CLIENT_SYNC_SCRIPT `duplicate`       | Swallow — client reconnect dedup working correctly                                                        |
| CLIENT_SYNC_SCRIPT `backpressure`    | Swallow — stream too long, client edits lost (acceptable)                                                 |
| `PUBLISH` fails                      | Non-fatal — online users won't see the offline edit immediately (stream worker will broadcast eventually) |

---

## Performance Targets

| Path                         | Target     | Notes                       |
| ---------------------------- | ---------- | --------------------------- |
| Redis HIT, no clientSnapshot | <15ms      | Pure in-memory + Y.Doc diff |
| Redis HIT, with delta        | <20ms      | +XRANGE apply               |
| S3 miss                      | ~100-120ms | S3 download + XRANGE + diff |
| With bidirectional sync      | +5-10ms    | Lua XADD + PUBLISH          |

---

## Y.Doc Lifecycle

```
tempDoc = new Y.Doc({ guid: pageId })  ← created with DETERMINISTIC GUID
Y.applyUpdate(tempDoc, snapshotBinary) ← load base snapshot
// ... apply delta, apply clientToServerDiff
Y.encodeStateAsUpdate(tempDoc, clientStateVector) → diff
tempDoc.destroy()  ← MUST destroy (prevents memory leak, doc holds observers)
```

**`Y.Doc({ guid: pageId })` is critical** — any two processes using the same GUID will produce compatible CRDT vectors. Using a random GUID would make diffs incompatible with the client's doc.

---

## Files

```
get-page-snapshot/
├── handler.ts    ← Implementation (this system design)
├── schema.ts     ← z.object({ pageId: cuid, clientSnapshot: base64string? })
├── index.ts      ← Re-exports handler + schema
└── README.md     ← This file
```

**Dependencies:**

- `infra/lua/client-sync.ts` — `CLIENT_SYNC_SCRIPT`
- `infra/page-keys.ts` — `PageKeys`, `PageTTLs`, `PageS3Keys`
- `infra/page-storage.ts` — `downloadPageSnapshot`
- `@/shared/yjs` — `Y` (Y.Doc, encodeStateAsUpdate, encodeStateVector, applyUpdate)
- `@/shared/lib/safe-apply-update` — non-fatal update application with logging
