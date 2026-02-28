# page-update — WS Event Handler System Design

## Overview

**WS Event:** `page:page-update`  
**File:** `server/src/modules/pages/ws/events/page-update/handler.ts`  
**Latency Target:** <10ms p95 (hot-path — no S3, no Y.Doc, no stream reads)

Called on every keystroke/edit a client makes in the Tiptap editor. The handler is a pure **stateless gateway**: it validates, atomically appends to the Redis stream, ACKs the sender, and broadcasts — nothing more.

---

## Folder Structure

```
page-update/
├── handler.ts               — thin orchestrator, sequences the 4 steps
├── schema.ts                — { pageId: cuid, update: base64, dedupeId: uuid }
├── index.ts                 — re-exports handler + schema
├── README.md                — this file
└── steps/
    ├── check-auth.ts        — Steps 1+2: ZSCORE subscriber + GET lock check
    ├── validate-update.ts   — Step 3:    base64 decode + size limit + Yjs binary check
    ├── append-to-stream.ts  — Step 4:    Lua ATOMIC_PAGE_UPDATE_SCRIPT (dedupe + XADD)
    └── broadcast.ts         — Steps 5+6: ACK sender socket + PUBLISH to page:events
```

**Step grouping rationale:**

- `check-auth` combines ZSCORE + GET — both are Redis guard reads with no branching between them
- `broadcast` combines ACK + PUBLISH — ACK must succeed before PUBLISH; they share `streamId`
- Splitting either pair would add a file for a single Redis call, hurting readability without benefit

---

## Position in 5-Phase Sync Lifecycle

```
Phase 4: useNetworkSync

  ydoc.on('update', (update, origin) => {
    if (origin === YjsOrigin.Local) {
      wsManager.emit('page:page-update', {
        pageId,
        update: base64(update),
        dedupeId: uuidv4(),       ← client generates per-update UUID
      })
    }
  })

         ↓  WS frame: page:page-update
  ┌─────────────────────┐
  │  pageUpdateHandler  │   ← THIS FILE
  └─────────────────────┘
         ↓ ACK → sender
         ↓ PUBLISH → wsRegistry → all other subscribers
```

---

## Architecture — Stateless Gateway

```
pageUpdateHandler(ctx, socket, { pageId, update, dedupeId })
      │
      ├─ 1. SUBSCRIBER CHECK (Redis-only, no DB)
      │    ZSCORE page:{pageId}:subscribers userId
      │    → null  → throw AppError("NOT_SUBSCRIBED") → error frame to sender
      │    → score → continue
      │
      ├─ 2. LOCK CHECK (eventually consistent, best-effort)
      │    GET page:{pageId}:lock
      │    → "1"  → throw AppError("PAGE_LOCKED") → error frame to sender
      │    → null → continue
      │
      ├─ 3. BINARY VALIDATION
      │    validatePageUpdate(update)           ← infra/page-validator.ts
      │    → { ok: false, reason: 'empty' }     → throw AppError INVALID_UPDATE
      │    → { ok: false, reason: 'too-large' } → throw AppError UPDATE_TOO_LARGE
      │    → { ok: false, reason: 'invalid-base64' } → throw AppError INVALID_ENCODING
      │    → { ok: true, binary: Buffer }       → continue
      │
      ├─ 4. ATOMIC STREAM APPEND (Lua, 1 RTT — <2ms)
      │    ctx.redis.eval(ATOMIC_PAGE_UPDATE_SCRIPT, 2,
      │      KEYS[1] = page:{pageId}:stream
      │      KEYS[2] = page:{pageId}:dedupe:{dedupeId}
      │      ARGV[1] = PageTTLs.DEDUPE      (60s)
      │      ARGV[2] = update               (base64 Yjs binary delta)
      │      ARGV[3] = pageId
      │      ARGV[4] = userId
      │      ARGV[5] = dedupeId
      │      ARGV[6] = MAX_STREAM_LEN       (50_000)
      │    )
      │    → returns flat array: [ok, streamId, status]
      │                                                 ← NOT JSON (unlike board-update)
      │    status='duplicate'    → ACK with status:'duplicate', return early
      │    status='backpressure' → throw AppError RATE_LIMIT_EXCEEDED
      │    status='ok'           → continue with streamId
      │
      ├─ 5. ACK SENDER
      │    socket.send(createSuccessFrame(dedupeId, "page:update-ack", {
      │      dedupeId,
      │      status: "sent",
      │      streamId,
      │      pageId,
      │    }))
      │    WHY BEFORE PUBLISH: Durability guarantee — client marks update as
      │    persisted before broadcast. ACK failing = client should retry.
      │
      └─ 6. PUB/SUB BROADCAST
           PUBLISH page:{pageId}:events JSON.stringify({
             message: createSuccessFrame(undefined, "page:page-update", {
               pageId, streamId, update, userId, timestamp
             }),
             originSocketId: socketId,  ← wsRegistry skips sender's socket
           })
           → Redis pub/sub → wsRegistry.dispatch() on all gateway nodes
           → All subscribers receive "page:page-update" event
           → Client: safeApplyUpdate(ydoc, update, origin: YjsOrigin.Remote)
```

---

## ATOMIC_PAGE_UPDATE_SCRIPT — Full Signature

```
KEYS[1] = page:{pageId}:stream              ← XADD target
KEYS[2] = page:{pageId}:dedupe:{dedupeId}   ← SETEX dedup marker (60s TTL)

ARGV[1] = dedupeTtl     (PageTTLs.DEDUPE = 60)
ARGV[2] = update        (base64-encoded Yjs XmlFragment binary delta)
ARGV[3] = pageId
ARGV[4] = userId
ARGV[5] = dedupeId      (UUIDv4 from client)
ARGV[6] = maxStreamLen  (50_000 — backpressure threshold)

Returns: flat 3-element array [ok: '1'|'0', streamId: string, status: string]
  status = 'ok' | 'duplicate' | 'backpressure'
```

> **IMPORTANT:** Returns a **flat array** `[string, string, string]` — NOT a JSON string.  
> Parse as: `const [ok, streamId, status] = result as [string, string, string]`  
> Board-update uses `executeAtomicBoardUpdate()` which returns parsed JSON — pages calls `ctx.redis.eval()` directly.

**XADD fields written to stream:**

```
pageId, update (base64), userId, dedupeId
```

The stream worker reads these fields during `processBoardBatch()`.

---

## Redis Operations Summary

| Step | Operation           | Key                           | Purpose                          |
| ---- | ------------------- | ----------------------------- | -------------------------------- |
| 1    | `ZSCORE`            | `page:{id}:subscribers`       | Auth check — is user subscribed? |
| 2    | `GET`               | `page:{id}:lock`              | Lock check — is page locked?     |
| 4    | `EXISTS` (Lua)      | `page:{id}:dedupe:{dedupeId}` | Deduplicate retries              |
| 4    | `XLEN` (Lua)        | `page:{id}:stream`            | Backpressure guard               |
| 4    | `XADD MAXLEN` (Lua) | `page:{id}:stream`            | Append update to stream          |
| 4    | `SETEX` (Lua)       | `page:{id}:dedupe:{dedupeId}` | Mark dedupeId as seen (60s)      |
| 6    | `PUBLISH`           | `page:{id}:events`            | Broadcast to all subscribers     |

**Total Redis RTTs:** 3 (ZSCORE + GET + eval)  
**Hot path budget:** ZSCORE ~0.5ms + GET ~0.5ms + eval ~1.5ms + ACK ~0ms + PUBLISH ~0.5ms = **~3ms**

---

## Input Schema

```typescript
// schema.ts (already exists)
z.object({
  pageId: z.string().cuid(), // which page
  update: z.string(), // base64(Y.encodeStateAsUpdate delta)
  dedupeId: z.string().uuid(), // UUIDv4, client-generated per update
});
```

## Output Events

| Event              | Target                | Payload                                           |
| ------------------ | --------------------- | ------------------------------------------------- |
| `page:update-ack`  | sender socket only    | `{ dedupeId, status, streamId, pageId }`          |
| `page:page-update` | all other subscribers | `{ pageId, streamId, update, userId, timestamp }` |

---

## Pages vs Whiteboard (board-update) — Key Differences

| Concern              | Whiteboard (board-update)             | Pages (page-update)                                       |
| -------------------- | ------------------------------------- | --------------------------------------------------------- |
| Lua invocation       | `executeAtomicBoardUpdate()` wrapper  | `ctx.redis.eval(ATOMIC_PAGE_UPDATE_SCRIPT, ...)` directly |
| Lua return           | JSON string → `JSON.parse()`          | Flat array `[string, string, string]`                     |
| Keys module          | `WhiteboardKeys`                      | `PageKeys`                                                |
| TTLs module          | `WhiteboardTTLs`                      | `PageTTLs`                                                |
| Binary validation    | `validateYjsUpdate(binary)` → boolean | `validatePageUpdate(base64)` → `{ ok, binary, reason }`   |
| Redis client         | `appRedis` (global import)            | `ctx.redis` (injected context)                            |
| ACK event type       | `whiteboard:update-ack`               | `page:update-ack`                                         |
| Broadcast event type | `whiteboard:board-update`             | `page:page-update`                                        |
| Broadcast channel    | `page:{id}:events`                    | `page:{id}:events` (same pattern)                         |
| Lock key value       | `"1"`                                 | `userId string` (lock owner)                              |

> **Lock key difference:** Whiteboard checks `isLocked === "1"`. Pages stores the lock **owner's userId** (`GET page:{id}:lock` returns userId or null). Check: `lockOwner && lockOwner !== userId` (owner can still edit their own locked page).

---

## Failure Modes

| Failure                      | Handling                          | Client Impact                                             |
| ---------------------------- | --------------------------------- | --------------------------------------------------------- |
| Not subscribed (ZSCORE null) | `error frame NOT_SUBSCRIBED`      | Client should re-subscribe                                |
| Page locked by another user  | `error frame PAGE_LOCKED`         | Client shows "Page locked" toast                          |
| Invalid base64               | `error frame INVALID_ENCODING`    | Client bug — SDK should never send invalid base64         |
| Update too large (>5MB)      | `error frame UPDATE_TOO_LARGE`    | Client should split update                                |
| Duplicate dedupeId (Lua)     | `success ACK status:'duplicate'`  | Client ignores — already persisted                        |
| Stream backpressure          | `error frame RATE_LIMIT_EXCEEDED` | Client backs off; stream worker catching up               |
| PUBLISH fails                | Log + swallow                     | Subscribers miss this update — gap-fill at next subscribe |
| Unexpected error             | `error frame INTERNAL_ERROR`      | Client can retry                                          |

---

## Lua Script Reference

| Script                      | File                       | Used in step |
| --------------------------- | -------------------------- | ------------ |
| `ATOMIC_PAGE_UPDATE_SCRIPT` | `infra/lua/page-update.ts` | Step 4       |

Pre-loaded at startup via `loadAllLuaScripts()` in `infra/lua/index.ts`. Use SHA from `LuaShas.atomicPageUpdate` for production (EVALSHA).

---

## Improvement Plan (future work)

- **Metrics pipeline:** histogram for latency, counter for success/duplicate/backpressure rates, gauge for update size. Add after baseline is instrumented.
- **Automatic snapshot trigger:** When backpressure is hit, enqueue a snapshot job instead of just erroring. Currently relies on stream worker's threshold-based compaction.
- **Lock owner check:** Confirm the lock key stores userId (not `"1"`) so lock owner can self-edit without being blocked.
- **Schema — update validation:** Currently validates base64 format only. Consider adding structural Yjs binary validation (first byte prefix check) to reject obviously corrupt data early.
