# Locking Service Architecture

## Overview

The `LockingService` (`src/services/locking`) provides atomic, distributed locking primitives using Redis and generic Lua scripts. It is designed to handle high-concurrency race conditions, specifically for resource reservation (like slugs, emails) and idempotency.

## Design Principles

1.  **Atomic "Check-and-Set"**: All lock operations invoke Lua scripts that bundle checks (e.g., "is this owned by me?") with actions ("delete", "set new"). This reduces network round-trips to **1 RTT** and prevents race windows.
2.  **Functional API**: The service exposes pure async functions, not a class wrapper.
3.  **Strict Ownership**: Locks cannot be released or switched unless the caller proves ownership (except for force-expiration via TTL).

## API Primitives

### 1. `acquire(key, owner, ttl)`

Simple mutex. Returns `true` if acquired, `false` if taken.

```typescript
const success = await LockingService.acquire("lock:resource:1", userId, 10);
```

### 2. `release(key, owner)`

Safe release. Only deletes if `GET key == owner`.

```typescript
await LockingService.release("lock:resource:1", userId);
```

### 3. `switch(oldKey, newKey, owner, ttl, userResKey, newSlug)`

**"Rolling Reservation" Pattern**. Atomically:

1.  Checks fast-fail if `newKey` is taken by someone else.
2.  Acquires `newKey`.
3.  Releases `oldKey` (if owned by us).
4.  **Updates `userResKey`** to point to `newSlug` (Atomic Pointer Update).

Useful for forms where a user types "apple" (reserved), then changes to "apricot" (reserves apricot, frees apple).

**Note:** In the codebase, this is named `switchLock` internally but exposed as `switch` on the `LockingService` object. This is because `switch` is a reserved keyword in TypeScript/JavaScript.

```typescript
await LockingService.switch(
  oldLockKey,
  newLockKey,
  userId,
  180,
  userResPtr,
  "apricot"
);
```

### 4. `finalize(lockKey, persistenceKey, value, ttl, owner, [userResKey])`

**"Lock-to-Cache" Transition**. Atomically:

1.  Validates ownership of `lockKey`.
2.  Deletes `lockKey`.
3.  Deletes optional `userResKey` (cleanup).
4.  Sets `persistenceKey` (e.g., `workspace:exists:slug`).
    Used after a successful DB transaction to convert a temporary lock into a semi-permanent "Allocated" state.

## Usage Example (Workspace Creation)

```typescript
// 1. Reserve
await LockingService.switch(oldSlugLock, newSlugLock, userId, 180);

// 2. DB Transaction
const workspace = await db.workspace.create(...);

// 3. Finalize (Cleanup)
await LockingService.finalize(
  newSlugLock,
  `workspace:exists:${slug}`,
  "1",
  3600,
  userId
);
```
