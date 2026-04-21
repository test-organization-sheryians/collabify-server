# Clerk Webhook Scalable Architecture Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `webhooks.ts` to a multi-provider plugin architecture supporting unlimited webhook providers (Clerk, Stripe, GitHub, etc.), each with unlimited event types, using a handler-per-event pattern.

**Architecture:** Directory-based structure with `providers/<name>/handlers/<event>.ts`. Each provider has its own route, verification logic, and handler registry. Handlers are self-contained with co-located Zod validation.

**Tech Stack:** Hono, TypeScript, Clerk webhooks (svix), Zod validation

**Existing Integration:**
- `server/src/services/clerk/webhook.ts` - ClerkWebhookService with svix verification
- `server/src/services/clerk/types.ts` - ClerkWebhookEvent union type

---

## File Structure

### New Structure
```
server/src/app/routes/webhooks/
├── index.ts                     # Main router - mounts provider routes
├── errors.ts                   # Shared webhook error types
└── providers/
    └── clerk/
        ├── index.ts           # POST /api/webhooks/clerk - verify + dispatch
        ├── types.ts          # Extends services/clerk/types.ts with Zod
        └── handlers/
            ├── index.ts     # Type-safe handler registry
            ├── user-created.ts
            ├── user-updated.ts
            └── user-deleted.ts
```

### Files to CREATE:
- `server/src/app/routes/webhooks/index.ts` - Main router
- `server/src/app/routes/webhooks/errors.ts` - Webhook-specific error types
- `server/src/app/routes/webhooks/providers/clerk/index.ts` - Clerk provider route
- `server/src/app/routes/webhooks/providers/clerk/types.ts` - Zod schemas for Clerk
- `server/src/app/routes/webhooks/providers/clerk/handlers/index.ts` - Handler registry
- `server/src/app/routes/webhooks/providers/clerk/handlers/user-created.ts`
- `server/src/app/routes/webhooks/providers/clerk/handlers/user-updated.ts`
- `server/src/app/routes/webhooks/providers/clerk/handlers/user-deleted.ts`

### Files to MODIFY:
- `server/src/app/routes/webhooks.ts` - Replace with route to webhooks/index.ts

### Files to DELETE:
- `server/src/app/routes/webhooks.ts` (after refactor complete)

---

## Task 1: Create Webhook Errors Module

**Files:**
- Create: `server/src/app/routes/webhooks/errors.ts`

- [ ] **Step 1: Create errors.ts**

```typescript
export class WebhookProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly safe: boolean = false
  ) {
    super(message);
    this.name = "WebhookProcessingError";
  }
}

export class WebhookValidationError extends WebhookProcessingError {
  constructor(message: string, code: string = "VALIDATION_ERROR") {
    super(message, code, 400, true);
    this.name = "WebhookValidationError";
  }
}

export class WebhookNotFoundError extends WebhookProcessingError {
  constructor(provider: string, eventType: string) {
    super(
      `No handler registered for ${provider} event: ${eventType}`,
      "HANDLER_NOT_FOUND",
      500,
      true
    );
    this.name = "WebhookNotFoundError";
  }
}
```

- [ ] **Step 2: Verify file created**

Run: `cat server/src/app/routes/webhooks/errors.ts`

Expected: Error class definitions

---

## Task 2: Create Main Webhooks Router

**Files:**
- Create: `server/src/app/routes/webhooks/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
import { Hono } from "hono";
import { clerkWebhookRoutes } from "./providers/clerk";

const webhooksApp = new Hono();

webhooksApp.route("/clerk", clerkWebhookRoutes);

export default webhooksApp;
```

- [ ] **Step 2: Verify file created**

---

## Task 3: Create Clerk Provider Types (Zod + Integration)

**Files:**
- Create: `server/src/app/routes/webhooks/providers/clerk/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
import { z } from "zod";
import type { ClerkWebhookEvent } from "@/services/clerk/types";

export const UserEventDataSchema = z.object({
  id: z.string(),
  email_addresses: z.array(
    z.object({
      id: z.string(),
      email_address: z.string().email(),
      verification: z
        .object({
          status: z.string(),
          strategy: z.string(),
        })
        .nullable(),
    })
  ),
  primary_email_address_id: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  image_url: z.string().nullable().or(z.string()),
});

export const UserCreatedPayloadSchema = z.object({
  type: z.literal("user.created"),
  data: UserEventDataSchema,
});

export const UserUpdatedPayloadSchema = z.object({
  type: z.literal("user.updated"),
  data: UserEventDataSchema,
});

export const UserDeletedPayloadSchema = z.object({
  type: z.literal("user.deleted"),
  data: z.object({
    id: z.string(),
    deleted: z.boolean(),
    object: z.literal("user"),
  }),
});

export type UserCreatedPayload = z.infer<typeof UserCreatedPayloadSchema>;
export type UserUpdatedPayload = z.infer<typeof UserUpdatedPayloadSchema>;
export type UserDeletedPayload = z.infer<typeof UserDeletedPayloadSchema>;

export type ClerkWebhookPayload =
  | UserCreatedPayload
  | UserUpdatedPayload
  | UserDeletedPayload;

export function isClerkWebhookEvent(
  event: unknown
): event is ClerkWebhookEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    typeof event.type === "string"
  );
}
```

- [ ] **Step 2: Verify file created**

---

## Task 4: Create Clerk User Created Handler

**Files:**
- Create: `server/src/app/routes/webhooks/providers/clerk/handlers/user-created.ts`

- [ ] **Step 1: Create user-created.ts**

```typescript
import { z } from "zod";
import { syncUser } from "@/modules/user";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("webhooks:clerk:user-created");

export async function handleUserCreated(
  event: z.infer<typeof UserCreatedPayloadSchema>
): Promise<void> {
  const data = event.data;

  const primaryEmail =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id) ??
    data.email_addresses[0];

  if (!primaryEmail?.email_address) {
    logger.warn("Skipping user sync: No email found", { userId: data.id });
    return;
  }

  await syncUser(
    {
      clerkId: data.id,
      email: primaryEmail.email_address,
      fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      avatarUrl: data.image_url,
      emailVerified: primaryEmail.verification?.status === "verified",
    },
    { db, redis }
  );

  logger.info("Successfully synced user", { userId: data.id });
}
```

- [ ] **Step 2: Verify file created**

---

## Task 5: Create Clerk User Updated Handler

**Files:**
- Create: `server/src/app/routes/webhooks/providers/clerk/handlers/user-updated.ts`

- [ ] **Step 1: Create user-updated.ts**

```typescript
import { z } from "zod";
import { syncUser } from "@/modules/user";
import { db } from "@/infra/db";
import { redis } from "@/infra/redis";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("webhooks:clerk:user-updated");

export async function handleUserUpdated(
  event: z.infer<typeof UserUpdatedPayloadSchema>
): Promise<void> {
  const data = event.data;

  const primaryEmail =
    data.email_addresses.find((e) => e.id === data.primary_email_address_id) ??
    data.email_addresses[0];

  if (!primaryEmail?.email_address) {
    logger.warn("Skipping user sync: No email found", { userId: data.id });
    return;
  }

  await syncUser(
    {
      clerkId: data.id,
      email: primaryEmail.email_address,
      fullName: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      avatarUrl: data.image_url,
      emailVerified: primaryEmail.verification?.status === "verified",
    },
    { db, redis }
  );

  logger.info("Successfully synced user", { userId: data.id });
}
```

- [ ] **Step 2: Verify file created**

---

## Task 6: Create Clerk User Deleted Handler

**Files:**
- Create: `server/src/app/routes/webhooks/providers/clerk/handlers/user-deleted.ts`

- [ ] **Step 1: Create user-deleted.ts**

```typescript
import { z } from "zod";
import { db } from "@/infra/db";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("webhooks:clerk:user-deleted");

export async function handleUserDeleted(
  event: z.infer<typeof UserDeletedPayloadSchema>
): Promise<void> {
  const { id } = event.data;

  if (!id) {
    logger.warn("user.deleted webhook missing id — skipping");
    return;
  }

  await db.user.update({
    where: { clerkId: id },
    data: {
      deletedAt: new Date(),
      status: "DELETED",
    },
  });

  logger.info("Soft-deleted user via webhook", { userId: id });
}
```

- [ ] **Step 2: Verify file created**

---

## Task 7: Create Clerk Handler Registry

**Files:**
- Create: `server/src/app/routes/webhooks/providers/clerk/handlers/index.ts`

- [ ] **Step 1: Create handlers/index.ts**

```typescript
import { z } from "zod";
import { WebhookValidationError, WebhookNotFoundError } from "../../../errors";
import type {
  UserCreatedPayload,
  UserUpdatedPayload,
  UserDeletedPayload,
  ClerkWebhookPayload,
} from "../types";
import { handleUserCreated } from "./user-created";
import { handleUserUpdated } from "./user-updated";
import { handleUserDeleted } from "./user-deleted";

export type ClerkWebhookHandler<T extends ClerkWebhookPayload = ClerkWebhookPayload> = (
  event: T
) => Promise<void>;

export interface HandlerEntry<T extends ClerkWebhookPayload = ClerkWebhookPayload> {
  handler: ClerkWebhookHandler<T>;
  schema: z.ZodType<T>;
}

const handlerRegistry: Record<string, HandlerEntry> = {
  "user.created": {
    handler: handleUserCreated as ClerkWebhookHandler,
    schema: UserCreatedPayloadSchema,
  },
  "user.updated": {
    handler: handleUserUpdated as ClerkWebhookHandler,
    schema: UserUpdatedPayloadSchema,
  },
  "user.deleted": {
    handler: handleUserDeleted as ClerkWebhookHandler,
    schema: UserDeletedPayloadSchema,
  },
};

export function getClerkHandler<T extends ClerkWebhookPayload>(
  eventType: string
): ClerkWebhookHandler<T> {
  const entry = handlerRegistry[eventType];
  if (!entry) {
    throw new WebhookNotFoundError("clerk", eventType);
  }
  return entry.handler as ClerkWebhookHandler<T>;
}

export function validateClerkEvent<T extends ClerkWebhookPayload>(
  eventType: string,
  data: unknown
): T {
  const entry = handlerRegistry[eventType];
  if (!entry) {
    throw new WebhookNotFoundError("clerk", eventType);
  }
  const result = entry.schema.safeParse(data);
  if (!result.success) {
    throw new WebhookValidationError(
      `Invalid payload for ${eventType}: ${result.error.message}`
    );
  }
  return result.data as T;
}

export {
  handleUserCreated,
  handleUserUpdated,
  handleUserDeleted,
  UserCreatedPayloadSchema,
  UserUpdatedPayloadSchema,
  UserDeletedPayloadSchema,
};
```

- [ ] **Step 2: Verify file created**

---

## Task 8: Create Clerk Provider Route

**Files:**
- Create: `server/src/app/routes/webhooks/providers/clerk/index.ts`

- [ ] **Step 1: Create provider index.ts**

```typescript
import { Hono, Context } from "hono";
import { ClerkWebhookService } from "@/services/clerk/webhook";
import {
  getClerkHandler,
  validateClerkEvent,
  type ClerkWebhookPayload,
} from "./handlers";
import { createLogger } from "@/shared/lib/logger";
import { WebhookProcessingError } from "../../../errors";

const logger = createLogger("webhooks:clerk");
const clerkWebhookRoutes = new Hono();

clerkWebhookRoutes.post("/", async (c: Context) => {
  const payload = await c.req.text();
  const headers = {
    "svix-id": c.req.header("svix-id"),
    "svix-timestamp": c.req.header("svix-timestamp"),
    "svix-signature": c.req.header("svix-signature"),
  };

  try {
    const rawEvent = await ClerkWebhookService.verifyWebhook(payload, headers);
    const eventType = (rawEvent as { type: string }).type;

    logger.info("Processing Clerk Webhook", { eventType });

    const event = validateClerkEvent<ClerkWebhookPayload>(eventType, rawEvent);
    const handler = getClerkHandler(eventType);
    await handler(event);

    return c.json({ success: true });
  } catch (err) {
    if (err instanceof WebhookProcessingError) {
      logger.error("Webhook Processing Error", {
        code: err.code,
        message: err.message,
      });
      return c.json({ error: err.message }, err.statusCode);
    }

    logger.error("Webhook Error", { err });
    return c.text("Bad Request", 400);
  }
});

export { clerkWebhookRoutes };
```

- [ ] **Step 2: Verify file created**

---

## Task 9: Replace webhooks.ts to Mount New Router

**Files:**
- Modify: `server/src/app/routes/webhooks.ts`

- [ ] **Step 1: Replace webhooks.ts**

```typescript
import webhooksApp from "./webhooks";

const webhookRouter = webhooksApp;

export default webhookRouter;
```

- [ ] **Step 2: Verify server.ts imports still work**

Run: `cd server && bun run typecheck 2>&1 | head -20`

Expected: No errors related to webhooks

---

## Task 10: Verify Typecheck

- [ ] **Step 1: Run typecheck**

```bash
cd server && bun run typecheck 2>&1
```

Expected: No type errors

- [ ] **Step 2: Start server and test webhook**

```bash
cd server && bun run dev
```

In another terminal:
```bash
# Test with a mock Clerk webhook (you'll need svix CLI or similar)
```

---

## Summary of Changes

| Action | File |
|--------|------|
| CREATE | `src/app/routes/webhooks/index.ts` (router) |
| CREATE | `src/app/routes/webhooks/errors.ts` |
| CREATE | `src/app/routes/webhooks/providers/clerk/index.ts` |
| CREATE | `src/app/routes/webhooks/providers/clerk/types.ts` |
| CREATE | `src/app/routes/webhooks/providers/clerk/handlers/index.ts` |
| CREATE | `src/app/routes/webhooks/providers/clerk/handlers/user-created.ts` |
| CREATE | `src/app/routes/webhooks/providers/clerk/handlers/user-updated.ts` |
| CREATE | `src/app/routes/webhooks/providers/clerk/handlers/user-deleted.ts` |
| MODIFY | `src/app/routes/webhooks.ts` (simplify) |

---

## Route Structure

| Endpoint | Handler |
|----------|---------|
| `POST /api/webhooks/clerk` | `providers/clerk/index.ts` |

---

## Adding New Providers

To add a new webhook provider (e.g., Stripe):

1. Create `providers/stripe/index.ts` - Route + verification
2. Create `providers/stripe/types.ts` - Zod schemas
3. Create `providers/stripe/handlers/` - One file per event
4. Add to `webhooks/index.ts`: `webhooksApp.route("/stripe", stripeWebhookRoutes)`

No changes to existing code.

---

## Adding New Event Types

To add a new Clerk event type (e.g., session created):

1. Create `providers/clerk/handlers/session-created.ts`
2. Add to `providers/clerk/handlers/index.ts` registry
3. Done - no changes to provider route

---

## Type Safety Guarantees

1. **Zod schemas in types.ts** - Validated before handler dispatch
2. **Handler registry stores schemas** - Enables validation before execution
3. **Discriminated union** - `ClerkWebhookPayload` union type
4. **Type inference** - Handler functions typed from Zod schemas
5. **No `any` or `unknown` casts beyond necessary** - Strict typing throughout

---

## Benefits

| Aspect | How It's Handled |
|--------|-------------------|
| Multiple providers | `providers/` subdirectories per provider |
| Multiple events | `handlers/` subdirectory per provider |
| Type safety | Zod schemas + union types |
| Testability | Each handler independent, importable |
| Maintainability | Clear boundaries, self-contained handlers |
| Extensibility | Add provider/event by creating files + registering |

---

## Execution Options

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task

**2. Inline Execution** - Execute tasks in this session

Which approach?

---

## Future: Adding More Providers (Example: Stripe)

```
providers/stripe/
├── index.ts              # POST /api/webhooks/stripe
├── types.ts              # Zod schemas (payment_intent.succeeded, etc.)
└── handlers/
    ├── index.ts          # Registry
    └── payment-succeeded.ts
```

This architecture scales to any number of providers and events.