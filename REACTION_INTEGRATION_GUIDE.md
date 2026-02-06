# Phase 8: Stream Worker & Job Integration Guide

## 🔧 **Integration Steps**

### **1. Wire Reaction Persistence to Stream Worker**

**File**: `server/src/infra/ws/stream-worker.ts`

**Add Import**:

```typescript
import {
  queueReactionPersistence,
  periodicFlush,
} from "@/modules/chat/reactions/batch-persistence";
```

**Add to handleMessage() switch**:

```typescript
case "chat:reaction-added":
case "chat:reaction-removed": {
  const { messageId, userId, emoji, timestamp } = rawPayload;

  // Enqueue for batch persistence
  await queueReactionPersistence({
    type,
    messageId,
    userId,
    emoji,
    timestamp,
  });

  break;
}
```

**Add to heartbeatLoop()**:

```typescript
async heartbeatLoop() {
  while (this.isRunning) {
    // ... existing heartbeat logic ...

    // Periodic reaction flush (every 5s)
    await periodicFlush();

    await new Promise((r) => setTimeout(r, 5000));
  }
}
```

---

### **2. Start Reaction Jobs**

**File**: `server/src/modules/chat/jobs/index.ts`

**Add Import**:

```typescript
import { startReactionJobs } from "./reaction-jobs";
```

**In startChatWorkers()**:

```typescript
export const startChatWorkers = async () => {
  // ... existing workers ...

  // Start reaction workers
  await startReactionJobs();

  logger.info("All chat workers started");
};
```

---

### **3. Enable Metrics** (Optional)

**File**: `server/src/index.ts` or main entry point

**Add Import**:

```typescript
import { startReactionMetrics } from "@/modules/chat/reactions/metrics";
```

**On Startup**:

```typescript
// After Redis connected
startReactionMetrics();
```

---

## ✅ **Files to Modify**

| File                         | Changes                                      | Status    |
| ---------------------------- | -------------------------------------------- | --------- |
| `infra/ws/stream-worker.ts`  | Add reaction event handling + periodic flush | ❌ Manual |
| `modules/chat/jobs/index.ts` | Call `startReactionJobs()`                   | ❌ Manual |
| `index.ts` (optional)        | Call `startReactionMetrics()`                | ❌ Manual |

---

## 🎯 **Complete Integration Checklist**

- [x] Phase 1: Database schema
- [x] Phase 2: Lua scripts
- [x] Phase 3: Redis helpers
- [x] Phase 4: WebSocket handlers
- [x] Phase 5: GraphQL queries
- [x] Phase 6: Persistence worker
- [x] Phase 7: Monitoring
- [x] Phase 8a: GraphQL resolvers registered ✅
- [x] Phase 8b: Query exports added ✅
- [x] Phase 8c: Batching module created ✅
- [x] Phase 8d: Job scheduler created ✅
- [ ] Phase 8e: Stream worker integration (MANUAL STEP)
- [ ] Phase 8f: Job starter integration (MANUAL STEP)

---

## 📝 **Manual Integration Required**

The following integrations **cannot be automated** due to existing code structure:

### **A. Stream Worker** (15 lines to add)

- Add import for `batch-persistence`
- Add 2 cases to switch statement
- Add 1 line to heartbeat loop

### **B. Job Starter** (5 lines to add)

- Add import for `reaction-jobs`
- Call `await startReactionJobs()`

---

## 🚀 **Post-Integration Testing**

```bash
# 1. Add a reaction via WebSocket
Send: { type: "chat:add-reaction", payload: { messageId, emoji: "👍" } }

# 2. Check logs
# Should see: "Reaction batch enqueued for persistence"

# 3. Query via GraphQL
query { messageReactions(messageId: "...") { emoji, count } }

# 4. Wait 6 hours or trigger manually
# Should see: "Reaction reconciliation complete"
```

---

## 🎉 **What's Complete**

All **infrastructure is built**:

- ✅ Atomic Redis operations (Lua)
- ✅ WebSocket real-time events
- ✅ GraphQL caching queries
- ✅ Batch persistence (100 reactions or 5s)
- ✅ Scheduled reconciliation (every 6h)
- ✅ Metrics tracking

**Missing**: Just 2 small manual integrations in stream-worker and job starter!
