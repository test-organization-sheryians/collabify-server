# `createPage` — Service Handler System Design

## Overview

`createPage` is a **GraphQL Mutation** handler responsible for bootstrapping a new Notion-style rich-text page.
Unlike simple CRUD mutations, it orchestrates across **4 systems** in a defined safe order:

```
PostgreSQL (Prisma) → S3 (Yjs snapshot) → PostgreSQL (s3Key update) → Redis (stream bootstrap)
```

The handler is **atomic at the DB layer** (Prisma `$transaction`) but orchestrates S3 and Redis
**outside the transaction** to avoid holding a DB connection open during network I/O.

---

## Input

```ts
type CreatePageInput = {
  workspaceId: string   // cuid — must be a workspace the user belongs to
  projectId:   string   // cuid — must belong to workspaceId
  parentId?:   string | null  // cuid — null = root-level page
  title?:      string         // default "Untitled", max 500 chars
  icon?:       string         // emoji, max 10 chars
  coverUrl?:   string url     // optional cover image
  position:    number         // fractional index — must be finite
  collaboratorIds?: string[]  // additional workspace members to add as VIEWER
}
```

---

## Output

```ts
type CreatePageResult = {
  page: Page; // the newly created page, ready to subscribe to
};
```

> The returned `page` includes the `s3Key`, `lastSnapshotStreamId`, and `collaborators`
> fields needed by the client to immediately subscribe and render.

---

## Step-by-Step Execution Flow

```
Caller ──► createPage handler
              │
              ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 1 — Auth: workspace member check (DB read)        │
        │  Fail fast: 403 if user is not a workspace member       │
        └───────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 2 — Project validation (DB read)                  │
        │  Verify project.workspaceId === input.workspaceId       │
        │  Prevents cross-workspace page injection                │
        └───────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 3 — Parent page validation (DB read, if provided) │
        │  Verify parentPage.projectId === input.projectId        │
        │  Prevents cross-project tree injection                  │
        └───────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 4 — Collaborator batch validation (DB read)        │
        │                                                          │
        │  • Deduplicate input.collaboratorIds                     │
        │  • Remove creator (added automatically in Step 5)        │
        │  • Batch check: workspaceMember.findMany                 │
        │  • Invalid IDs → gracefully skipped (logged as WARN)    │
        │  • Valid IDs → stored as validCollaboratorIds[]          │
        └───────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 5 — Atomic DB transaction                          │
        │                                                          │
        │  tx.page.create({ ...fields, s3Key: null })              │
        │     ↓                                                     │
        │  tx.pageCollaborator.create({ userId, role: EDITOR })    │  ← creator
        │     ↓                                                     │
        │  tx.pageCollaborator.createMany([...validIds], VIEWER)   │  ← others
        │     ↓                                                     │
        │  return { page, addedCollaborators }                     │
        └───────────────────────────┬─────────────────────────────┘
                                    │  (transaction committed)
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 6 — Initialize Y.Doc (in-memory, no network I/O)  │
        │                                                          │
        │  const doc = new Y.Doc({ guid: page.id })               │
        │  doc.getText("content")   ← initialize root XmlFragment │
        │  const state = Y.encodeStateAsUpdate(doc)  → Buffer     │
        └───────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 7 — Upload initial snapshot to S3                  │
        │                                                          │
        │  uploadPageSnapshot(page.id, state)                     │
        │  Key: pages/{pageId}/latest.yjs                         │
        │                                                          │
        │  ⚠ If this fails: delete page from DB (compensating tx) │
        └───────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 8 — Update page with s3Key + snapshot metadata    │
        │                                                          │
        │  db.page.update({                                        │
        │    s3Key: PageS3Keys.LatestSnapshot(page.id),           │
        │    lastSnapshotStreamId: "0-0",                         │
        │    lastSnapshotAt: new Date(),                           │
        │  })                                                      │
        └───────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────┐
        │  STEP 9 — Bootstrap Redis stream + consumer group        │
        │                                                          │
        │  XGROUP CREATE page:{id}:stream page-workers 0 MKSTREAM │
        │                                                          │
        │  • MKSTREAM creates the stream if it doesn't exist       │
        │  • BUSYGROUP error → silently ignored (idempotent)       │
        │  • Any other error → logged + rethrown                  │
        └───────────────────────────┬─────────────────────────────┘
                                    │
                                    ▼
                               return { page }
```

---

## Why This Order Matters

| Why S3 upload happens _outside_ the Prisma `$transaction`                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Holding a Prisma transaction open while doing S3 I/O blocks a DB connection for the entire upload duration. At scale, this exhausts the connection pool. Instead: commit the row with `s3Key: null`, upload, then update in a separate query. |

| Why `s3Key` starts as `null`, not `""`                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An empty string `""` is ambiguous — callers can't tell if S3 upload failed or just hasn't run yet. `null` is an explicit sentinel: this page has a DB row but no snapshot yet. `getPageSnapshot` uses this to decide whether to fall back to S3 or return an empty doc. |

| Why Redis stream is bootstrapped here (not lazily)                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| If the stream doesn't exist when the first `page-update` WS event arrives, `XADD` will auto-create it — but the consumer group won't exist, and the stream worker won't see it until the next `subscribe-page` call bumps the epoch. Bootstrapping at creation time avoids a race window where updates are lost before the stream worker picks up the page. |

---

## Failure Modes & Compensating Actions

| Failure point               | What happens                                                 | Recovery                                                                                                                            |
| --------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Step 1–4 (validation)       | `AppError` thrown → transaction never opens                  | None needed                                                                                                                         |
| Step 5 (DB transaction)     | Rolls back automatically                                     | None needed                                                                                                                         |
| Step 7 (S3 upload fails)    | **Compensating delete**: `db.page.delete({ id })`            | Page row is removed; client receives error                                                                                          |
| Step 8 (s3Key update fails) | Page exists with `s3Key: null`                               | `getPageSnapshot` falls back to empty doc; stream worker updates `s3Key` after first snapshot                                       |
| Step 9 (Redis stream fails) | Non-BUSYGROUP error → re-thrown; S3 and DB already committed | Client receives error; page is marked created but stream not ready; `subscribe-page` handler recreates the group on first subscribe |

---

## Key Design Decisions

### 1. Creator is always EDITOR, additional collaborators default to VIEWER

```
PageCollaborator.role:
  creator        → EDITOR  (can write, lock, add collaborators)
  collaboratorIds → VIEWER  (can read-only until explicitly promoted)
```

This mirrors how Notion works: you share a page to someone and they get view access by default.

### 2. Batch collaborator validation — graceful degradation

Invalid `collaboratorIds` (non-workspace members, deleted users) are silently skipped with a
`logger.warn`. The page is still created successfully. This is intentional — the client should
show which users were skipped in the response but not fail the entire mutation because of one
invalid ID.

### 3. Parent page ownership validation

Before accepting `parentId`, we verify `parentPage.projectId === input.projectId`. This prevents
a user from setting their new page as a child of a page in a different project (cross-project
tree injection), which would break the sidebar tree query scoped by `projectId`.

### 4. Y.Doc GUID = pageId (deterministic)

```ts
const doc = new Y.Doc({ guid: page.id });
```

The GUID is the page's DB `id`. This makes the Y.Doc globally unique and allows the stream
worker to reconstruct a correct CRDT without any coordination — any worker that rebuilds a
snapshot from the stream will produce the same result.

### 5. Fractional indexing for `position`

`position: Float` allows insertion between any two siblings without re-numbering them:

```
Page A: position = 1.0
Page B: position = 2.0
Insert between: new.position = 1.5   ← no rebalancing needed
```

The client is responsible for computing the correct `position` value. The handler validates
`z.number().finite()` only — it does NOT enforce uniqueness (two pages at the same position
are allowed; they'll sort deterministically by `createdAt` as a tiebreaker).

---

## Folder Structure

```
create-page/
  handler.ts                     ← pure orchestrator — calls steps in order
  schema.ts                      ← Zod input schema + CreatePageInput type
  type-defs.ts                   ← GraphQL SDL: createPage mutation + types
  index.ts                       ← barrel: { handler, schema, typeDefs }
  README.md                      ← this file
  steps/
    validate-access.ts           ← Steps 1–3
    validate-collaborators.ts    ← Step 4
    create-page-record.ts        ← Step 5
    init-page-content.ts         ← Steps 6–8
    init-page-stream.ts          ← Step 9
```

### Step → file mapping

| README Steps | File                        | What happens inside                                                                                    |
| ------------ | --------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1, 2, 3      | `validate-access.ts`        | Workspace member check · project ownership · parent cross-project guard                                |
| 4            | `validate-collaborators.ts` | Deduplicate IDs · remove creator · batch workspace-member check · return valid IDs                     |
| 5            | `create-page-record.ts`     | `db.$transaction`: `page.create` + creator `EDITOR` collab + bulk `VIEWER` collabs                     |
| 6, 7, 8      | `init-page-content.ts`      | `new Y.Doc({ guid })` → `encodeStateAsUpdate` → S3 upload → `page.update(s3Key, lastSnapshotStreamId)` |
| 9            | `init-page-stream.ts`       | `XGROUP CREATE … MKSTREAM`; BUSYGROUP silently ignored                                                 |

> **Why 5 files for 9 steps?**
> Steps 1–3 are all read-only auth guards — they share the same failure contract and have no return values, so splitting them adds no benefit.
> Steps 6–8 are tightly coupled: step 8 cannot run without step 7 succeeding. Splitting them would require passing a `Buffer` across file boundaries for no gain.
> Steps with independent failure modes or distinct return values (steps 4, 5, 9) each get their own file.

## Dependencies

| Import               | From                       | Usage                                   |
| -------------------- | -------------------------- | --------------------------------------- |
| `ServiceContext`     | `@/graphql/types`          | Handler signature, `ctx.db`, `ctx.auth` |
| `AppError`           | `@/shared/errors`          | Auth/validation error throws            |
| `createLogger`       | `@/shared/lib/logger`      | Structured logging                      |
| `uploadPageSnapshot` | `../../infra/page-storage` | S3 initial snapshot upload              |
| `PageS3Keys`         | `../../infra/page-keys`    | S3 key generation                       |
| `PageKeys`           | `../../infra/page-keys`    | Redis stream + group key generation     |
| `Y`                  | `@/shared/yjs`             | Empty Y.Doc creation                    |
| `CreatePageInput`    | `./schema`                 | Input type                              |

---

## Redis Keys Touched

| Key                | Operation                    | When                      |
| ------------------ | ---------------------------- | ------------------------- |
| `page:{id}:stream` | `XGROUP CREATE ... MKSTREAM` | Step 9 — stream bootstrap |

> No presence keys or slot keys are touched at creation time.
> Those are managed by the `subscribe-page` WS handler at first subscription.

---

## Database Queries (in order)

| Step | Query                              | Purpose                           |
| ---- | ---------------------------------- | --------------------------------- |
| 1    | `workspaceMember.findUnique`       | Auth gate                         |
| 2    | `project.findUnique`               | Cross-workspace protection        |
| 3    | `page.findUnique` (parentId)       | Cross-project tree protection     |
| 4    | `workspaceMember.findMany`         | Batch collaborator validation     |
| 5a   | `page.create` (tx)                 | Create page row                   |
| 5b   | `pageCollaborator.create` (tx)     | Add creator as EDITOR             |
| 5c   | `pageCollaborator.createMany` (tx) | Add extra collaborators as VIEWER |
| 8    | `page.update`                      | Write s3Key + snapshot metadata   |
