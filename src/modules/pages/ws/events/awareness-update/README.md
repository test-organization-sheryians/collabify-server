# awareness-update — WS Event Handler System Design

## Overview

**WS Event:** `page:awareness-update`  
**File:** `server/src/modules/pages/ws/events/awareness-update/handler.ts`  
**Latency Target:** <5ms p95 (faster than page-update — 2 Redis RTTs maximum)

Carries `y-protocols/awareness` binary payloads: cursor positions, selections, user presence metadata (name, color). **Never written to the Redis stream. Never persisted. Fire-and-forget.**

---

## Folder Structure

```
awareness-update/
├── handler.ts    — 2-step stateless gateway (implement)
├── schema.ts     — { pageId: cuid, update: base64 }  (exists ✅)
├── index.ts      — re-exports handler + schema  (exists ✅)
└── README.md     — this file
```

> No `steps/` subfolder — only 2 operations total (ZSCORE + PUBLISH). Splitting into step files would add indirection with zero benefit on a 2-RTT hot path.

---

## Input Schema

```typescript
// schema.ts (already exists)
z.object({
  pageId: z.string().cuid(),
  update: z.string(), // base64(awarenessProtocol.encodeAwarenessUpdate(...))
});
```

The `update` is encoded by the client's `PageAwarenessProvider`:

```typescript
// client: page-awareness-provider.ts
const changedClients = [...added, ...updated, ...removed];
const update = awarenessProtocol.encodeAwarenessUpdate(
  awareness,
  changedClients
);
wsManager.emit("page:awareness-update", {
  pageId,
  update: uint8ArrayToBase64(update),
});
```

---

## Architecture — 2-Step Stateless Gateway

```
awarenessUpdateHandler(ctx, socket, { pageId, update })
      │
      ├─ 1. SILENT AUTH (ZSCORE — Redis-only, no DB)
      │    ZSCORE page:{pageId}:subscribers userId
      │    → null → return silently (no error frame, no log)
      │    → score → continue
      │
      │    WHY SILENT: Awareness is fire-and-forget. Sending an error frame
      │    for a stale subscriber wastes bandwidth and clutters client error
      │    handling. The WS lifecycle guarantees cleanup via unsubscribe-page.
      │
      └─ 2. PUBLISH (best-effort, no ACK)
           PUBLISH page:{pageId}:awareness JSON.stringify({
             update,           ← original base64 — do NOT re-encode
             userId,
             originSocketId,   ← wsRegistry skips sender's socket
           })
           → wsRegistry.dispatch() on all gateway nodes
           → Client applies: awarenessProtocol.applyAwarenessUpdate(awareness, decode(update))
           → No ACK to sender (fire-and-forget)
           → No Redis Stream (ephemeral — lost on disconnect is acceptable)
```

---

## Key Differences vs page-update

| Concern                    | page-update                      | awareness-update                                   |
| -------------------------- | -------------------------------- | -------------------------------------------------- |
| Auth failure               | `error frame NOT_SUBSCRIBED`     | **Silent return** — no error frame                 |
| Lock check                 | Yes (GET page:{id}:lock)         | **No** — awareness is never blocked                |
| Binary validation          | Full (decode + size + structure) | **None** — awareness packets are tiny (<200 bytes) |
| Stream write               | Yes (XADD via Lua, durable)      | **No** — ephemeral, no persistence                 |
| Lua script                 | ATOMIC_PAGE_UPDATE_SCRIPT        | **None** — plain PUBLISH                           |
| ACK to sender              | Yes (page:update-ack frame)      | **No** — pure fire-and-forget                      |
| Pub/Sub channel            | `page:{id}:events`               | **`page:{id}:awareness`** (separate channel)       |
| Redis RTTs                 | ~3                               | **~2** (ZSCORE + PUBLISH)                          |
| Data loss if PUBLISH fails | Gap-fill recovery                | **Acceptable** — next awareness update overwrites  |

---

## Redis Operations

| Step | Operation | Key                     | Notes                                         |
| ---- | --------- | ----------------------- | --------------------------------------------- |
| 1    | `ZSCORE`  | `page:{id}:subscribers` | Silent auth — null = silently return          |
| 2    | `PUBLISH` | `page:{id}:awareness`   | Payload: `{ update, userId, originSocketId }` |

**Total RTTs: 2**

---

## Pub/Sub Payload Shape

```typescript
// Published to: page:{pageId}:awareness
{
  update: string,          // base64 awareness binary (pass-through, not re-encoded)
  userId: string,          // who sent this
  originSocketId: string,  // wsRegistry excludes this socket from dispatch
}
```

Client side (in `useNetworkSync`):

```typescript
ws.on("page:awareness-update", ({ update }) => {
  awarenessProvider.applyRemoteUpdate(update);
  // which calls:
  awarenessProtocol.applyAwarenessUpdate(
    awareness,
    base64ToUint8Array(update),
    "remote"
  );
});
```

---

## Why a Separate Channel from page:events

`page:{id}:events` carries Yjs CRDT document updates — durable, ordered, streamed.  
`page:{id}:awareness` carries ephemeral cursor state — unordered, lossy, high-frequency.

Mixing them would:

- Force every subscribing node to deserialize awareness packets as Yjs updates
- Pollute the events backlog with ephemeral data
- Make gap-fill logic more complex

The subscription registry subscribes to **both channels** independently for each page room.

---

## Failure Modes

| Failure                           | Handling                                                     | Client Impact                                                               |
| --------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| User not subscribed (ZSCORE null) | Silent return                                                | None — stale state cleans up via WS lifecycle                               |
| PUBLISH fails (Redis down)        | Log + swallow                                                | Cursor state temporarily stale — self-heals on next update                  |
| Invalid base64                    | No validation — pass-through                                 | Server relays garbage; client `applyAwarenessUpdate` ignores malformed data |
| Packet too large (>1MB)           | No hard limit — awareness packets are <200 bytes by protocol | Theoretical — awareness protocol will never produce multi-MB updates        |

---

## Performance Targets

| Path                     | Target   |
| ------------------------ | -------- |
| ZSCORE hit + PUBLISH     | <5ms p95 |
| ZSCORE miss (silent)     | <2ms p95 |
| Publish failure (caught) | <2ms p95 |

---

## Improvement Plan (future)

- **Size guard:** Add a soft cap (~10KB) to reject obviously malformed awareness payloads early. Not a security risk but good hygiene.
- **Metrics:** Counter for awareness packets per page per minute — awareness flood from a buggy client is a realistic DoS vector worth monitoring.
- **Auth fast-path:** If subscriber check is moved to the WS upgrade/subscribe phase (pre-authorized room keys), this handler could drop ZSCORE entirely and be a pure single-RTT PUBLISH.
