# unsubscribe-page — WS Event Handler System Design

## Overview

**Event name:** `page:unsubscribe-page`  
**Direction:** Client → Server  
**Schema:** `z.object({ pageId: cuid })`

Called in two situations:

1. **Explicit leave** — user navigates away, client emits `page:unsubscribe-page`
2. **Socket disconnect cleanup** — connection dropped; the WS disconnect handler calls this internally

---

## Pages vs Whiteboard — Key Differences

| Concern            | Whiteboard                              | Pages                                                 |
| ------------------ | --------------------------------------- | ----------------------------------------------------- |
| Cleanup            | 2 separate Redis calls (ZREM + HINCRBY) | 1 atomic Lua script (ZREM + ZCARD + conditional ZREM) |
| Page deactivation  | Not implemented                         | Atomic: `ZREM sys:pages:active` when count=0          |
| Epoch bump         | Not implemented                         | `INCR sys:pages:epoch` on deactivation                |
| User state cleanup | `DEL BoardUserState`                    | `DEL PageUserState(pageId, userId)`                   |
| Awareness cleanup  | Not implemented                         | `DEL page:{id}:user:{uid}:state`                      |
| wsRegistry         | Not called                              | `unsubscribe` from BOTH channels (events + awareness) |
| ACK                | Not sent                                | Best-effort try/catch (socket may already be closing) |

---

## Workflow (6 steps)

```
Client → WS: page:unsubscribe-page { pageId }
    │
    ├─ 1. ATOMIC PRESENCE CLEANUP (Lua, 1 RTT)
    │    Script: UNSUBSCRIBE_CLEANUP_SCRIPT from infra/lua/cleanup.ts
    │    KEYS[1] = page:{pageId}:subscribers
    │    KEYS[2] = sys:pages:active
    │    ARGV[1] = userId, ARGV[2] = pageId
    │
    │    Atomically:
    │      ZREM subscribers userId
    │      remaining = ZCARD subscribers
    │      IF remaining == 0:
    │        ZREM sys:pages:active pageId  → stream worker stops polling
    │        return 1  (pageDeactivated)
    │      return 0
    │
    │    WHY ATOMIC:
    │    Two concurrent unsubscribes (last 2 users) could both see count=1 before either fires.
    │    Non-atomic: both trigger deactivation → double ZREM, double epoch bump.
    │
    ├─ 2. UNSUBSCRIBE SOCKET FROM BOTH CHANNELS
    │    await wsRegistry.unsubscribe(socketId, PageKeys.PageEvents(pageId))
    │    await wsRegistry.unsubscribe(socketId, PageKeys.PageAwareness(pageId))
    │    ← Must unsubscribe from both (subscribed to both in subscribe-page step 5)
    │
    ├─ 3. BUMP EPOCH (if page was deactivated)
    │    if (pageDeactivated === 1):
    │      await appRedis.incr(PageKeys.SysPagesEpoch())
    │      → Stream worker instances poll epoch → re-partition → stop consuming this page
    │      → Page becomes truly idle: no worker reads its stream
    │
    ├─ 4. CLEAN EPHEMERAL USER STATE
    │    await appRedis.del(PageKeys.PageUserState(pageId, userId))
    │    → Removes ephemeral cursor/viewport state hash
    │    → Non-fatal if key doesn't exist (DEL is idempotent)
    │
    ├─ 5. BROADCAST USER-LEFT
    │    await appRedis.publish(
    │      PageKeys.PageEvents(pageId),
    │      createSuccessFrame("page:user-left", { pageId, userId, timestamp: Date.now() })
    │    )
    │    → Fan-out to all remaining subscribers via Pub/Sub
    │    → Client: removes collaborator avatar from presence bar
    │
    └─ 6. ACK (best-effort)
         try {
           socket.send(createSuccessFrame("page:unsubscribe-success", { pageId }))
         } catch {
           // Socket may already be closing — swallow silently
         }
         → Log but do not propagate errors (leaving is always safe)
```

---

## Redis Operations Summary

| Step | Operation                                   | Key                                         | Notes                    |
| ---- | ------------------------------------------- | ------------------------------------------- | ------------------------ |
| 1    | `ZREM` + `ZCARD` + conditional `ZREM` (Lua) | `page:{id}:subscribers`, `sys:pages:active` | Atomic, 1 RTT            |
| 3    | `INCR`                                      | `sys:pages:epoch`                           | Only if page deactivated |
| 4    | `DEL`                                       | `page:{id}:user:{uid}:state`                | Idempotent               |
| 5    | `PUBLISH`                                   | `page:{id}:events`                          | Broadcast user-left      |

---

## What Happens to the Stream Worker

```
pageDeactivated = 0 (subscribers remain):
  Stream worker continues consuming page:{pageId}:stream normally.

pageDeactivated = 1 (last subscriber left):
  ZREM sys:pages:active pageId
  INCR sys:pages:epoch
  → Worker's next heartbeat check:
       activePageIds = ZRANGE sys:pages:active 0 -1
       pageId no longer in set → worker drops it from polling
  → Page stream stops being consumed (no more XREADGROUP)
  → Stream entries accumulate but worker ignores → safe (MAXLEN ~50000 cap in XADD)
```

---

## Disconnect Cleanup (implicit unsubscribe)

The WS disconnect handler calls this same function for **all** pages a socket was subscribed to. The flow is identical — the only difference is step 6 (ACK) is skipped since the socket is gone.

```typescript
// infra/ws/disconnect-handler.ts
const subscribedPageIds = wsRegistry
  .getTopicsForSocket(socketId)
  .filter((t) => t.startsWith("page:"))
  .map((t) => t.split(":")[1]);

for (const pageId of subscribedPageIds) {
  await unsubscribePageHandler(ctx, socket, { pageId });
}
```

---

## Failure Modes

| Failure                      | Handling Strategy                                         |
| ---------------------------- | --------------------------------------------------------- |
| Lua cleanup script fails     | Log + still attempt wsRegistry unsubscribe (best-effort)  |
| wsRegistry.unsubscribe fails | Log + continue (socket cleanup is best-effort)            |
| user-left broadcast fails    | Log + continue (non-fatal, presence updates are eventual) |
| ACK send fails               | Swallow silently (socket may already be closed)           |

---

## Lua Script Used

Pre-loaded at startup via `infra/lua/index.ts` (EVALSHA):

- `UNSUBSCRIBE_CLEANUP_SCRIPT` — atomic ZREM + ZCARD + conditional ZREM (1 RTT)

See: [`infra/lua/cleanup.ts`](../../../infra/lua/cleanup.ts)

---

## Output Events Emitted

| Event                      | Direction         | Recipients                | When        |
| -------------------------- | ----------------- | ------------------------- | ----------- |
| `page:user-left`           | Pub/Sub broadcast | All remaining subscribers | Always      |
| `page:unsubscribe-success` | Direct            | This socket               | Best-effort |

---

## Files

```
unsubscribe-page/
├── handler.ts    ← Implementation (this system design)
├── schema.ts     ← z.object({ pageId: cuid })
└── index.ts      ← Re-exports handler + schema
```

**Dependencies:**

- `infra/lua/cleanup.ts` — UNSUBSCRIBE_CLEANUP_SCRIPT
- `infra/page-keys.ts` — PageKeys.PageSubscribers, PageEvents, PageAwareness, PageUserState, SysActivePages, SysPagesEpoch
- `infra/ws/subscription-registry` — wsRegistry
