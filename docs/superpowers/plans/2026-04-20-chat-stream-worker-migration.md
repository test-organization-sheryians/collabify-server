# Chat Stream-Worker Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `src/infra/ws/stream-worker.ts` into `src/modules/chat/infra/stream-worker/` following the whiteboard stream-worker pattern. Only move - no refactoring yet.

**Architecture:** Create `src/modules/chat/infra/stream-worker/` directory and move the stream-worker file there. Update imports in `chat/index.ts` and any other files that import from the old path. Leave old imports broken for now - they'll be fixed in a subsequent refactor phase.

**Tech Stack:** Bun, TypeScript, Redis Streams, BullMQ

---

## File Structure

### Files to CREATE:
- `server/src/modules/chat/infra/stream-worker/index.ts` - Re-exports streamWorker
- `server/src/modules/chat/infra/stream-worker/types.ts` - Type definitions extracted from stream-worker.ts
- `server/src/modules/chat/infra/stream-worker/config.ts` - Configuration constants

### Files to MODIFY:
- `server/src/modules/chat/index.ts` - Update import path from `@/infra/ws/stream-worker` to `./infra/stream-worker`
- `server/src/modules/chat/index.ts` - Update `streamWorker.init()` call if needed

### Files to DELETE:
- `server/src/infra/ws/stream-worker.ts` - The original file

### Files with TEMPORARY BROKEN IMPORTS (will be fixed later):
- Any file importing from `@/infra/ws/stream-worker` after the move

---

## Task 1: Create Target Directory Structure

- [ ] **Step 1: Create chat/infra/stream-worker directory**

```bash
mkdir -p /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker
```

- [ ] **Step 2: Verify directory created**

```bash
ls -la /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/
```

Expected: `stream-worker` directory exists

---

## Task 2: Copy stream-worker.ts to Target Location

- [ ] **Step 1: Copy the stream-worker file**

```bash
cp /home/jimmy/Desktop/DEV/official-collabify/server/src/infra/ws/stream-worker.ts /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/worker.ts
```

- [ ] **Step 2: Verify copy succeeded**

```bash
head -20 /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/worker.ts
```

Expected: File content starts with import statements

---

## Task 3: Create index.ts Re-export

- [ ] **Step 1: Create index.ts**

```bash
cat > /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/index.ts << 'EOF'
export { streamWorker } from "./worker";

export const WORKER_GROUP_NAME = "chat-workers:v1";
export const CONSUMER_NAME_PREFIX = "worker";
EOF
```

- [ ] **Step 2: Verify index.ts created**

```bash
cat /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/index.ts
```

Expected: Exports streamWorker from worker, plus constants

---

## Task 4: Create config.ts with Constants

- [ ] **Step 1: Create config.ts**

```bash
cat > /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/config.ts << 'EOF'
import * as os from "os";

export const WORKER_GROUP_NAME = "chat-workers:v1";

export function getConsumerName(): string {
  return `worker-${os.hostname()}-${process.pid}`;
}

export const BATCH_COUNT = 10;
export const BLOCK_MS = 2000;
export const HEARTBEAT_INTERVAL_MS = 5000;
export const RECOVERY_LOOP_INTERVAL_MS = 60000;
export const IDLE_THRESHOLD_MS = 60000;
export const DLQ_KEY = "stream-worker:dlq";
EOF
```

- [ ] **Step 2: Verify config.ts created**

```bash
cat /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/config.ts
```

Expected: Configuration constants

---

## Task 5: Create types.ts

- [ ] **Step 1: Create types.ts**

```bash
cat > /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/types.ts << 'EOF'
export interface StreamWorker {
  isRunning: boolean;
  assignedStreams: Set<string>;
  knownGroups: Set<string>;
  init(): Promise<void>;
  heartbeatLoop(): Promise<void>;
  consumptionLoop(): Promise<void>;
  recoveryLoop(): Promise<void>;
  ensureGroups(streams: string[]): Promise<void>;
  safeProcessMessage(streamKey: string, id: string, fields: string[]): Promise<void>;
  processMessage(streamKey: string, id: string, fields: string[]): Promise<void>;
  stop(): void;
}

export interface WorkerAssignment {
  consumerName: string;
  streams: string[];
}
EOF
```

- [ ] **Step 2: Verify types.ts created**

```bash
cat /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/types.ts
```

Expected: TypeScript interfaces for the stream worker

---

## Task 6: Update chat/index.ts Import

- [ ] **Step 1: Read current chat/index.ts**

Read: `server/src/modules/chat/index.ts`

- [ ] **Step 2: Update import from `@/infra/ws/stream-worker` to `./infra/stream-worker`**

Replace:
```typescript
import { streamWorker } from "@/infra/ws/stream-worker";
```

With:
```typescript
import { streamWorker } from "./infra/stream-worker";
```

- [ ] **Step 3: Verify the import change**

```bash
grep -n "streamWorker" /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/index.ts
```

Expected: Import shows `./infra/stream-worker`

---

## Task 7: Verify Typecheck Fails (Expected)

- [ ] **Step 1: Run typecheck to see what breaks**

```bash
cd /home/jimmy/Desktop/DEV/official-collabify/server && bun run typecheck 2>&1 | head -50
```

Expected: Errors related to `@/infra/ws/stream-worker` imports that no longer exist. This is expected - we'll fix these in the next phase.

- [ ] **Step 2: Note the failing imports for future refactor**

Record which files have broken imports from `@/infra/ws/stream-worker`:
```bash
grep -rn "@/infra/ws/stream-worker" /home/jimmy/Desktop/DEV/official-collabify/server/src/ 2>/dev/null
```

Expected: List of files that will need import updates (for the next refactor phase)

---

## Task 8: Delete Original File

- [ ] **Step 1: Delete the original stream-worker.ts**

```bash
rm /home/jimmy/Desktop/DEV/official-collabify/server/src/infra/ws/stream-worker.ts
```

- [ ] **Step 2: Verify original file deleted**

```bash
ls /home/jimmy/Desktop/DEV/official-collabify/server/src/infra/ws/stream-worker.ts 2>&1
```

Expected: "No such file or directory"

---

## Task 9: Verify chat Module Works

- [ ] **Step 1: Check if there are any TypeScript errors in the new location**

```bash
cd /home/jimmy/Desktop/DEV/official-collabify/server && bun build ./src/modules/chat/infra/stream-worker/worker.ts --target bun 2>&1 | head -20
```

Expected: Either success or errors that are unrelated to the move (we'll fix real errors in refactor phase)

- [ ] **Step 2: Verify the file structure**

```bash
ls -la /home/jimmy/Desktop/DEV/official-collabify/server/src/modules/chat/infra/stream-worker/
```

Expected:
```
index.ts
worker.ts
config.ts
types.ts
```

---

## Task 10: Commit

- [ ] **Step 1: Stage changes**

```bash
cd /home/jimmy/Desktop/DEV/official-collabify/server
git add src/modules/chat/infra/stream-worker/
git add src/modules/chat/index.ts
git rm src/infra/ws/stream-worker.ts
```

- [ ] **Step 2: Commit with descriptive message**

```bash
git commit -m "refactor(chat): move stream-worker to chat module infra

Move stream-worker from infra/ws/ to modules/chat/infra/stream-worker/
following the whiteboard stream-worker pattern. This is the first
step in decoupling chat infrastructure from shared infra.

Files created:
- chat/infra/stream-worker/index.ts
- chat/infra/stream-worker/worker.ts (moved from infra/ws)
- chat/infra/stream-worker/config.ts
- chat/infra/stream-worker/types.ts

Note: Some imports may be broken - these will be fixed in
the subsequent refactor phase.
"
```

- [ ] **Step 3: Verify commit**

```bash
git log -1 --stat
```

Expected: Shows the new files and deleted file

---

## Summary of Changes

| Action | File |
|--------|------|
| CREATE | `src/modules/chat/infra/stream-worker/index.ts` |
| CREATE | `src/modules/chat/infra/stream-worker/worker.ts` (moved) |
| CREATE | `src/modules/chat/infra/stream-worker/config.ts` |
| CREATE | `src/modules/chat/infra/stream-worker/types.ts` |
| MODIFY | `src/modules/chat/index.ts` (updated import) |
| DELETE | `src/infra/ws/stream-worker.ts` |

---

## Phase 2 (Future - Not in This Plan)

After this move is complete and committed, a subsequent phase will:
1. Fix all broken imports from `@/infra/ws/stream-worker`
2. Refactor the stream-worker code following chat module patterns
3. Update any documentation references

**Plan complete and saved to `docs/superpowers/plans/2026-04-20-chat-stream-worker-migration.md`.**

---

## Execution Options

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?