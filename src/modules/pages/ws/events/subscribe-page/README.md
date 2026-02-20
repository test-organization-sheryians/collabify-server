# subscribe-page — WS Event Handler System Design

## Overview

**Event name:** `page:subscribe-page`  
**Direction:** Client → Server  
**Schema:** `z.object({ pageId: cuid, lastStreamId?: string = "0-0" })`

Called by the client **after** `getPageSnapshot` GraphQL resolves. The gateway is entirely stateless — no Y.Doc, no S3, no merging. All state is managed via Redis.

---

## Why `getPageSnapshot` BEFORE `page:subscribe-page`?

```
Phase 1 (GraphQL):  getPageSnapshot → apply diff → captures lastStreamId
Phase 4 (WS):       page:subscribe-page { lastStreamId }
                     ↳ XRANGE stream from lastStreamId → replay gap only
```

The snapshot is a heavy binary transfer with retry semantics. WebSocket is for streaming deltas only — NOT for large one-shot binary payloads.

---

## Pages vs Whiteboard — Key Differences

| Concern              | Whiteboard                | Pages                                    |
| -------------------- | ------------------------- | ---------------------------------------- |
| Pub/Sub channels     | 1 (`events`)              | **2** (`events` + `awareness`)           |
| Awareness            | Not implemented           | Separate channel (`page:{id}:awareness`) |
| Lock check           | In handler                | Redis GET `page:{id}:lock`               |
| Lua scripts          | Inline strings            | Pre-authored in `infra/lua/presence.ts`  |
| User state key       | `BoardUserState(id, uid)` | `PageUserState(id, uid)`                 |
| lastStreamId default | optional                  | defaults to `"0-0"` (schema default)     |

---

## Workflow (9 steps)

```
Client → WS: page:subscribe-page { pageId, lastStreamId }
    │
    ├─ 1. AUTH
    │    db.pageCollaborator.findFirst({ where: { pageId, userId } })
    │    include: { page: { id, deletedAt, isArchived, isLocked } }
    │    → 403 FORBIDDEN if not collaborator
    │    → 404 NOT_FOUND if page.deletedAt !== null
    │    → NOTE: archived pages allowed (read-only enforced in page-update handler)
    │
    ├─ 2. LOCK STATUS
    │    isLocked = Boolean(await appRedis.get(PageKeys.PageLock(pageId)))
    │    → informational only (sent in subscribe-success payload)
    │    → enforcement is in page-update handler, not here
    │
    ├─ 3. PRESENCE TRACKING (Lua atomic — 1 RTT)
    │    Script: PRESENCE_TRACKING_SCRIPT from infra/lua/presence.ts
    │    KEYS[1] = page:{pageId}:subscribers
    │    ARGV[1] = userId, ARGV[2] = timestamp, ARGV[3] = PageTTLs.SUBSCRIBERS (86400)
    │    Returns: [isNew: 0|1, subscriberCount: integer]
    │
    │    WITHOUT atomicity: two concurrent sockets for the same user could both
    │    see isNew=1 → duplicate user-joined broadcasts, double epoch bump.
    │
    ├─ 4. PAGE ACTIVATION (only if subscriberCount === 1)
    │    Script: PAGE_ACTIVATION_SCRIPT from infra/lua/presence.ts
    │    KEYS[1] = sys:pages:active, KEYS[2] = sys:pages:epoch
    │    ARGV[1] = pageId, ARGV[2] = timestamp
    │    Effect: ZADD sys:pages:active + INCR epoch
    │    → Stream worker sees new epoch → re-partitions → starts consuming this page
    │
    ├─ 5. SUBSCRIBE SOCKET TO BOTH CHANNELS
    │    await wsRegistry.subscribe(socketId, PageKeys.PageEvents(pageId))
    │    await wsRegistry.subscribe(socketId, PageKeys.PageAwareness(pageId))
    │    ← IMPORTANT: pages subscribe to TWO channels (content + cursors)
    │    ← Whiteboard only subscribes to one
    │
    ├─ 6. SEND SUBSCRIBE-SUCCESS (direct to this socket only)
    │    createSuccessFrame("page:subscribe-success", {
    │      pageId,
    │      isLocked,
    │      subscriberCount,
    │      collaborators: [{ userId, fullName, avatarUrl }]  ← from ZRANGE + db.user.findMany
    │    })
    │    → client renders collaborator avatars + lock banner
    │
    ├─ 7. REPLAY GAP (if lastStreamId !== "0-0")
    │    XRANGE page:{pageId}:stream (lastStreamId, +] COUNT 5000
    │    → Exclusive start: AFTER lastStreamId (not including it)
    │    → For each entry: socket.send(createSuccessFrame("page:page-update", { ... }))
    │    → Sends only to THIS socket — not broadcast
    │    → Closes the snapshot→subscribe window gap
    │    → Non-fatal: errors logged, continue
    │
    └─ 8. BROADCAST USER-JOINED (only if isNew === 1)
         user = await db.user.findUnique({ id: userId })
         await appRedis.publish(
           PageKeys.PageEvents(pageId),
           createSuccessFrame("page:user-joined", { pageId, userId, fullName, avatarUrl, timestamp })
         )
         → isNew=0: user reconnected / second tab → NO broadcast (prevents spam)
         → Existing subscribers receive via Pub/Sub fan-out
```

---

## Redis Operations Summary

| Step | Operation                                     | Key                                       | Notes                     |
| ---- | --------------------------------------------- | ----------------------------------------- | ------------------------- |
| 3    | `ZADD NX` + `ZADD` + `EXPIRE` + `ZCARD` (Lua) | `page:{id}:subscribers`                   | Atomic, 1 RTT             |
| 4    | `ZADD` + `INCR` (Lua)                         | `sys:pages:active`, `sys:pages:epoch`     | Only if count=1           |
| 5    | wsRegistry.subscribe × 2                      | `page:{id}:events`, `page:{id}:awareness` | Socket-level subscription |
| 6    | `ZRANGE`                                      | `page:{id}:subscribers`                   | Fetch active user IDs     |
| 7    | `XRANGE`                                      | `page:{id}:stream`                        | Replay gap, COUNT 5000    |
| 8    | `PUBLISH`                                     | `page:{id}:events`                        | user-joined broadcast     |

---

## Error Responses

```
page:subscribe-error { code: "FORBIDDEN", message: "Not a collaborator" }
page:subscribe-error { code: "NOT_FOUND", message: "Page deleted" }
```

---

## Failure Modes

| Failure                     | Handling Strategy                                        |
| --------------------------- | -------------------------------------------------------- |
| Replay gap XRANGE fails     | Log + continue (non-fatal; state vector sync handles it) |
| user-joined broadcast fails | Log + continue (non-fatal; presence still updated)       |
| DB collaborator check fails | 500 error sent, early return                             |
| wsRegistry.subscribe fails  | Fatal — must be caught + subscribe-error sent            |

---

## Lua Scripts Used

Both pre-loaded at startup via `infra/lua/index.ts` (EVALSHA):

- `PRESENCE_TRACKING_SCRIPT` — atomic NX + update + TTL + ZCARD (1 RTT)
- `PAGE_ACTIVATION_SCRIPT` — atomic ZADD active + INCR epoch (1 RTT)

See: [`infra/lua/presence.ts`](../../../infra/lua/presence.ts)

---

## Output Events Emitted

| Event                    | Direction         | Recipients      | When               |
| ------------------------ | ----------------- | --------------- | ------------------ |
| `page:subscribe-success` | Direct            | This socket     | Always on success  |
| `page:page-update`       | Direct            | This socket     | Replay gap entries |
| `page:user-joined`       | Pub/Sub broadcast | All subscribers | Only if isNew=1    |

---

## Files

```
subscribe-page/
├── handler.ts    ← Implementation (this system design)
├── schema.ts     ← z.object({ pageId: cuid, lastStreamId?: string = "0-0" })
└── index.ts      ← Re-exports handler + schema
```

**Dependencies:**

- `infra/lua/presence.ts` — PRESENCE_TRACKING_SCRIPT, PAGE_ACTIVATION_SCRIPT
- `infra/page-keys.ts` — PageKeys.PageSubscribers, PageEvents, PageAwareness, SysActivePages, SysPagesEpoch
- `infra/ws/subscription-registry` — wsRegistry
