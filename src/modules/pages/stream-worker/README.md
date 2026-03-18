# Pages Stream Worker — System Design

## Overview

**Path:** `server/src/modules/pages/stream-worker/`  
**Role:** Background process that consumes the Redis stream for each active page, applies Yjs updates to a Y.Doc, and compacts them into durable S3 snapshots.  
**Horizontally scalable:** Multiple instances partition pages via deterministic hash ring. No coordination DB — Redis is the only shared state.

---

## Folder Structure

```
stream-worker/
├── config.ts         — all tunable constants (batch size, thresholds, TTLs, env vars)
├── types.ts          — RawStreamEntry, PageUpdateResult, WorkerState
├── processor.ts      — applyUpdateBatch, shouldSnapshot, rebuildPageSnapshot
├── worker.ts         — startWorker: init + launch 3 async loops
├── worker-storage.ts — saveSnapshotToS3 wrapper (latest + historical)
└── index.ts          — re-export startWorker
```

---

## Architecture — 3 Cooperative Async Loops

```
startWorker(redis)
    │
    ├─ 1. loadAllLuaScripts(redis)      ← pre-load Lua SHAs before any loop starts
    │
    ├─ 2. heartbeatLoop()               ← fire-and-forget
    │       every HEARTBEAT_INTERVAL_MS (10s):
    │       ZADD sys:page-workers [now] CONSUMER_NAME
    │
    ├─ 3. recoveryLoop()               ← fire-and-forget
    │       every PEL_CLAIM_THRESHOLD_MS (60s):
    │       For each owned page:
    │         XAUTOCLAIM paginated → re-process claimed entries
    │
    └─ 4. processLoop()                ← await (blocking — main loop)
            while (running) { ... }
```

---

## Process Loop — Detailed Flow

```
processLoop():
    │
    ├─ 1. ZRANGE sys:pages:active 0 -1       ← active set (no SCAN)
    │    → [pageId1, pageId2, ...]
    │
    ├─ 2. Filter owned pages (hash ring)
    │    myPages = activePageIds.filter(p => djb2(p) % WORKER_COUNT === WORKER_INDEX)
    │
    ├─ 3. For each owned pageId:
    │    ├─ streamKey = page:{pageId}:stream
    │    ├─ XREADGROUP GROUP page-workers CONSUMER_NAME
    │    │   COUNT BATCH_SIZE(50) BLOCK BLOCK_TIMEOUT_MS(5000ms) STREAMS streamKey >
    │    │   → entries [ [id, [pageId, ..., update, ..., userId, ..., dedupeId, ...]], ... ]
    │    │
    │    ├─ Parse entries → RawStreamEntry[]
    │    ├─ applyUpdateBatch(entries)         ← build Y.Doc in-memory
    │    ├─ XACK all entry IDs               ← remove from PEL
    │    │
    │    └─ shouldSnapshot(seqSinceSnapshot, lastSnapshotAt)?
    │         YES → acquireSnapshotLock(pageId)
    │                → rebuildPageSnapshot(pageId, doc, redis, CONSUMER_NAME)
    │         NO  → continue
    │
    └─ await sleep(0)                        ← yield event loop between pages
```

---

## Hash Ring Partitioning

```typescript
// djb2 hash (same for all workers — must be deterministic)
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash;
}

function ownsPage(pageId: string): boolean {
  return Math.abs(djb2Hash(pageId)) % WORKER_COUNT === WORKER_INDEX;
}
```

**Why hash ring (not dynamic assignment):**

- Requires zero coordination — no lock, no leader election
- Deterministic: same pageId always maps to same worker
- Scale out: add pod, set `WORKER_COUNT = N+1`, rolling restart. Brief overlap (two workers own the same page) is safe because snapshot lock prevents dual writes.

**Env vars (Kubernetes StatefulSet):**

```yaml
env:
  - name: PAGE_WORKER_INDEX
    valueFrom: { fieldRef: { fieldPath: metadata.labels['apps.kubernetes.io/pod-index'] } }
  - name: PAGE_WORKER_COUNT
    value: "3"
```

---

## applyUpdateBatch — Y.Doc Build

```
applyUpdateBatch(entries: RawStreamEntry[], existingDoc?) → PageUpdateResult

  doc = existingDoc ?? new Y.Doc({ guid: entries[0].fields.pageId })
  doc.getXmlFragment('content')   ← MUST initialize — matches Tiptap binding
  doc.getMap('meta')              ← title, icon, cover

  for entry of entries:
    binary = Buffer.from(entry.fields.update, 'base64')
    safeApplyPageUpdate(doc, binary, { context: 'worker:batch', throwOnError: false })
    latestStreamId = entry.id

  return { pageId, doc, updateCount, latestStreamId }
```

> **`safeApplyPageUpdate` not `Y.applyUpdate`:** wraps in try/catch, logs corrupt entries, never throws — a single malformed update must not stall the entire batch.

---

## rebuildPageSnapshot — Full Rebuild Flow

```
rebuildPageSnapshot(pageId, doc, redis, consumerName):

  1. ACQUIRE SNAPSHOT LOCK
     SET page:{pageId}:snapshot:lock consumerName EX 300 NX
     → null = another worker owns it → return immediately (skip)
     → "OK"  = this worker rebuilds

  2. LOAD BASE SNAPSHOT (Redis-first)
     redis.getBuffer(page:{pageId}:snapshot:latest)
       → Hit: raw binary → Y.applyUpdate(doc, binary, 'worker:load-base')
       → Miss: S3 pages/{pageId}/latest.yjs → warm Redis → apply
       → Neither: doc starts empty (brand new page)

  3. XRANGE ALL stream entries
     XRANGE page:{pageId}:stream - + COUNT 10000
     for each [id, fields]:
       safeApplyPageUpdate(doc, Buffer.from(fields.update, 'base64'), { throwOnError: false })
       lastStreamId = id

  4. ENCODE
     newBinary = Y.encodeStateAsUpdate(doc)

  5. ATOMIC REDIS UPDATE (Lua — 1 RTT)
     ATOMIC_SNAPSHOT_UPDATE_SCRIPT:
       SET page:{pageId}:snapshot:latest newBinary EX SNAPSHOT_REDIS_TTL(24h)
       XTRIM page:{pageId}:stream MINID lastStreamId+1  ← prune consumed entries

  6. S3 UPLOAD
     PUT pages/{pageId}/latest.yjs           ← overwrite latest
     PUT pages/{pageId}/{timestamp}.yjs      ← historical archive

  7. DB UPDATE
     db.page.update({ s3Key, lastSnapshotStreamId: lastStreamId, lastSnapshotAt: now })

  8. RELEASE LOCK
     SNAPSHOT_LOCK_RELEASE_SCRIPT (Lua):
       GET lock → if value === consumerName → DEL   ← ownership check prevents racing

  9. doc.destroy()   ← ALWAYS in finally block (prevents Y.Doc memory leak)
```

---

## recoveryLoop — Dead Worker PEL Recovery

```
recoveryLoop():
  every PEL_CLAIM_THRESHOLD_MS (60s):

  For each owned pageId:
    XAUTOCLAIM page:{pageId}:stream page-workers CONSUMER_NAME
      MIN-IDLE-TIME PEL_CLAIM_THRESHOLD_MS(60000)
      START 0-0
      COUNT RECOVERY_BATCH_SIZE(100)
    → claimed entries → reprocess via applyUpdateBatch

WHY: If a worker crashes mid-batch, its PEL entries are never XACK'd.
After PEL_CLAIM_THRESHOLD_MS without heartbeat, a live worker claims them.
```

---

## heartbeatLoop — Worker Liveness

```
heartbeatLoop():
  every HEARTBEAT_INTERVAL_MS (10s):
  ZADD sys:page-workers [now] CONSUMER_NAME

Dead worker detection: ZRANGE sys:page-workers -inf (now - PEL_CLAIM_THRESHOLD_MS)
→ workers with score < (now - 60s) = dead → their PEL entries are claimable
```

---

## Snapshot Lock — Preventing Dual Writes

**Critical correctness invariant**: Only ONE worker may rebuild a page's snapshot at a time.

```
Acquire:  SET page:{pageId}:snapshot:lock CONSUMER_NAME EX 300 NX
           → null: failed (owned by another worker) → skip
           → "OK": acquired → proceed

Release:  SNAPSHOT_LOCK_RELEASE_SCRIPT (Lua atomic):
           val = GET lock
           if val == CONSUMER_NAME: DEL lock

WHY OWNERSHIP CHECK ON RELEASE: If lock TTL expires mid-rebuild (very long rebuild),
another worker may have re-acquired it. A blind DEL would steal their lock.
The Lua check prevents this by verifying ownership before deleting.
```

---

## Snapshot Decision — shouldSnapshot()

```typescript
shouldSnapshot(sequenceSinceSnapshot: number, lastSnapshotAt: number): boolean {
  return (
    sequenceSinceSnapshot >= SNAPSHOT_THRESHOLD &&    // 500 entries
    Date.now() - lastSnapshotAt >= SNAPSHOT_COOLDOWN_MS  // 60s cooldown
  );
}
```

| Config                   | Value           | Rationale                                      |
| ------------------------ | --------------- | ---------------------------------------------- |
| `SNAPSHOT_THRESHOLD`     | 500 entries     | ~500 keystrokes per 60s = ~1 snapshot/min peak |
| `SNAPSHOT_COOLDOWN_MS`   | 60,000ms        | Prevents snapshot thrash on burst writes       |
| `BATCH_SIZE`             | 50 entries/poll | Low latency: process 50 entries at a time      |
| `BLOCK_TIMEOUT_MS`       | 5,000ms         | Poll every 5s when stream is idle              |
| `PEL_CLAIM_THRESHOLD_MS` | 60,000ms        | Dead worker threshold: 6× heartbeat interval   |
| `SNAPSHOT_LOCK_TTL`      | 300s            | 5-minute safety net for very large docs        |

---

## Redis Keys Reference

| Key                         | Operation                                             | Purpose                                                                        |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `sys:pages:active`          | `ZRANGE 0 -1`                                         | All currently active page IDs                                                  |
| `sys:page-workers`          | `ZADD` / `ZRANGE`                                     | Heartbeat registry for all live workers                                        |
| `sys:pages:epoch`           | `GET`                                                 | Watched for re-partitioning signal (INCR by unsubscribe when page deactivated) |
| `page:{id}:stream`          | `XREADGROUP`, `XACK`, `XAUTOCLAIM`, `XRANGE`, `XTRIM` | Yjs update stream                                                              |
| `page:{id}:snapshot:latest` | `getBuffer`, `setex`                                  | Hot Redis snapshot cache                                                       |
| `page:{id}:snapshot:lock`   | `SET NX EX`, `GET`/`DEL`                              | Single-writer snapshot lock                                                    |

---

## Pages vs Whiteboard Worker — Key Differences

|                       | Whiteboard                                  | Pages                                                 |
| --------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Page discovery        | `SCAN board:*:stream` pattern               | `ZRANGE sys:pages:active` (no SCAN)                   |
| Partitioning          | All workers process all boards              | **Hash ring** by `djb2(pageId) % WORKER_COUNT`        |
| Y.Doc init            | `getArray('elements')` + `getMap('assets')` | **`getXmlFragment('content')` + `getMap('meta')`**    |
| Apply method          | `safeApplyUpdate` (shared util)             | **`safeApplyPageUpdate`** (pages-specific)            |
| Snapshot detection    | `ThresholdRegistry` plugin system           | **Simple `shouldSnapshot()` — count + cooldown**      |
| Snapshot Redis key    | JSON `{ snapshot, streamId, version }`      | **Raw binary** — `getBuffer()`                        |
| S3 key                | `boards/{boardId}/latest.yjs`               | **`pages/{pageId}/latest.yjs`**                       |
| DB update on snapshot | None                                        | **`db.page.update({ s3Key, lastSnapshotStreamId })`** |
| Snapshot lock         | Not used                                    | **`SET NX EX` + Lua ownership release**               |
| Epoch signal          | None                                        | **`GET sys:pages:epoch` → re-partition when changed** |

---

## Failure Modes & Mitigations

| Failure                                 | Symptom                           | Mitigation                                                                               |
| --------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| Worker crash mid-batch                  | PEL entries never XACK'd          | recoveryLoop XAUTOCLAIM after 60s                                                        |
| S3 upload fails                         | Snapshot written to Redis, not S3 | Next rebuild re-uploads. Redis TTL is 24h buffer                                         |
| Snapshot lock expires mid-rebuild       | Second worker may start rebuild   | Atomic Lua release checks ownership. Last-write-wins on Y.Doc merge — CRDT is idempotent |
| Two workers rebuild same page           | Duplicate S3 writes               | Safe — Y.Doc CRDT merge is idempotent. Snapshot lock reduces probability                 |
| XAUTOCLAIM on deleted stream            | Redis error                       | Caught per-stream, logged, continue next page                                            |
| DB update fails after S3                | s3Key stale in DB                 | Next snapshot will overwrite. `getPageSnapshot` falls back to old S3 key correctly       |
| Hash ring imbalance                     | Workers overwhelmed               | Add pods → set `WORKER_COUNT`, redeploy. Brief dual-ownership is safe                    |
| Stream grows past maxLen                | XADD rejects (BACKPRESSURE)       | `pageUpdateHandler` returns RATE_LIMIT_EXCEEDED. Snapshot rebuild trims stream           |
| Redis key evicted under memory pressure | `getBuffer` returns null          | Falls back to S3 (same as cold start). Standard resilience path                          |
| Large doc → snapshot > 5MB              | S3 upload slow                    | Snapshot lock TTL is 5min. `SNAPSHOT_COOLDOWN_MS` prevents frequent large builds         |

---

## Epoch-Based Re-Partitioning

When the last subscriber leaves a page, `unsubscribe-page` does:

```
INCR sys:pages:epoch
```

The process loop reads the epoch at the start of each cycle:

```typescript
const epoch = await redis.get(PageKeys.SysPagesEpoch());
if (epoch !== lastSeenEpoch) {
  // re-read sys:pages:active and recompute myPages
  lastSeenEpoch = epoch;
}
```

This ensures deactivated pages are dropped from the worker's owned set within one poll cycle, without requiring a restart or coordination message.

---

## Performance Targets

| Metric                 | Target              | Notes                                             |
| ---------------------- | ------------------- | ------------------------------------------------- |
| Entry → XACK latency   | <200ms              | For active pages with frequent updates            |
| Snapshot rebuild       | <5s for 10K entries | Y.Doc apply is CPU-bound but lightweight for text |
| S3 upload              | <2s for <5MB        | Standard PUT latency                              |
| PEL recovery           | <60s after crash    | Bounded by PEL_CLAIM_THRESHOLD_MS                 |
| Heartbeat registration | 10s interval        | 6× within PEL threshold = safe margin             |

---

## Improvement Plan (future)

- **XAUTOCLAIM cursor pagination:** Current recovery reads from `0-0` with COUNT 100. For large PELs, paginate using the returned next-cursor until `0-0` is returned.
- **Adaptive batch size:** Reduce `BATCH_SIZE` if `avgProcessingTimeMs` exceeds 200ms to avoid blocking the event loop.
- **Metrics pipeline:** Counters for snapshots/min, s3 failures, PEL claims, avg rebuild duration — integrate with Prometheus.
- **Historical snapshot pruning:** S3 historical archives (`pages/{id}/{timestamp}.yjs`) accumulate indefinitely. Add a periodic cleanup job that prunes files older than 30 days.
- **Graceful shutdown:** On `SIGTERM`, stop accepting new batches, wait for in-flight rebuild to complete, then exit. Prevents orphaned PEL entries on controlled restart.
