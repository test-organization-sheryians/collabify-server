import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: { chatMessage: { findMany: mock() } },
}));

mock.module("@/infra/redis", () => ({
  redis: { get: mock(), set: mock() },
}));

import { handler } from "./handler";
import { db } from "@/infra/db";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CONVERSATION_ID = "clh1111111111abcdefghijk0";
const WORKSPACE_ID    = "clh2222222222abcdefghijk1";

const validInput = {
  conversationId: CONVERSATION_ID,
  beforeSequence: 100,
  limit: 10,
};

const makeMessage = (sequence: number) => ({
  id: `msg-${sequence}`,
  conversationId: CONVERSATION_ID,
  authorUserId: "user-1",
  content: { text: `Message ${sequence}` },
  sequence,
  type: "TEXT",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  editedAt: null,
  threadId: null,
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const buildCtx = (overrides: Partial<ServiceContext> = {}): ServiceContext =>
  ({
    db: db as any,
    auth: { userId: "user-1", sessionId: "sess_test" },
    authGate: {
      getChannel: mock(async () => ({ workspaceId: WORKSPACE_ID })),
      assertChannelMember: mock(async () => {}),
    } as any,
    permissions: {
      assert: mock(async () => {}),
    } as any,
    loaders: {} as any,
    ...overrides,
  } as unknown as ServiceContext);

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getHistory", () => {
  beforeEach(() => {
    // Default: return 10 messages (sequences 99→90)
    (db.chatMessage.findMany as any).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => makeMessage(99 - i))
    );
  });

  // ── Section 1: Auth Gate ──────────────────────────────────────────────────

  describe("1. Auth Gate", () => {
    it("1.1 throws 401 when ctx.authGate is missing", async () => {
      const ctx = buildCtx({ authGate: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401 });
    });

    it("1.2 throws 401 when ctx.permissions is missing", async () => {
      const ctx = buildCtx({ permissions: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401 });
    });

    it("1.3 throws 404 when channel does not exist in cache or DB", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => null),
          assertChannelMember: mock(async () => {}),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 404 });
    });

    it("1.4 throws 403 when caller is not a channel member", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => ({ workspaceId: WORKSPACE_ID })),
          assertChannelMember: mock(async () => { throw AppError.forbidden(); }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 403 });
    });

    it("1.5 throws 403 when conversation:read permission is denied", async () => {
      const ctx = buildCtx({
        permissions: { assert: mock(async () => { throw AppError.forbidden(); }) } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 403 });
    });

    it("1.6 calls getChannel exactly once per request", async () => {
      const getChannel = mock(async () => ({ workspaceId: WORKSPACE_ID }));
      const ctx = buildCtx({ authGate: { getChannel, assertChannelMember: mock(async () => {}) } as any });
      await handler(validInput, ctx);
      expect(getChannel).toHaveBeenCalledTimes(1);
      expect(getChannel).toHaveBeenCalledWith(CONVERSATION_ID);
    });

    it("1.7 passes workspace scope to permissions.assert", async () => {
      const assert = mock(async () => {});
      const ctx = buildCtx({ permissions: { assert } as any });
      await handler(validInput, ctx);
      expect(assert).toHaveBeenCalledWith(
        "chat:channel:read",
        { type: "workspace", id: WORKSPACE_ID }
      );
    });
  });

  // ── Section 2: Success Path ───────────────────────────────────────────────

  describe("2. Success Path", () => {
    it("2.1 returns HistoryPayload with messages, hasMore, minSequence", async () => {
      const result = await handler(validInput, buildCtx());
      expect(result.messages).toHaveLength(10);
      expect(typeof result.hasMore).toBe("boolean");
      expect(result.minSequence).toBeDefined();
    });

    it("2.2 returns empty messages when none exist before cursor", async () => {
      (db.chatMessage.findMany as any).mockResolvedValueOnce([]);
      const result = await handler(validInput, buildCtx());
      expect(result.messages).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.minSequence).toBeNull();
    });

    it("2.3 queries with correct where clause", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            conversationId: CONVERSATION_ID,
            sequence: { lt: 100 },
            deletedAt: null,
          }),
        })
      );
    });

    it("2.4 queries with sequence DESC order", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { sequence: "desc" },
        })
      );
    });
  });

  // ── Section 3: Pagination ─────────────────────────────────────────────────

  describe("3. Pagination", () => {
    it("3.1 hasMore = true when DB returns limit+1 rows", async () => {
      // limit=10, return 11 rows
      (db.chatMessage.findMany as any).mockResolvedValueOnce(
        Array.from({ length: 11 }, (_, i) => makeMessage(99 - i))
      );
      const result = await handler(validInput, buildCtx());
      expect(result.hasMore).toBe(true);
      expect(result.messages).toHaveLength(10); // sliced to limit
    });

    it("3.2 hasMore = false when DB returns exactly limit rows", async () => {
      const result = await handler(validInput, buildCtx());
      expect(result.hasMore).toBe(false);
    });

    it("3.3 fetches limit+1 rows from DB", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 11 }) // limit(10) + 1
      );
    });

    it("3.4 minSequence = lowest sequence in slice (last item, since DESC order)", async () => {
      // Rows: 99, 98, ... 90 (10 rows, no hasMore)
      const result = await handler(validInput, buildCtx());
      expect(result.minSequence).toBe(90);
    });

    it("3.5 minSequence = null when no messages returned", async () => {
      (db.chatMessage.findMany as any).mockResolvedValueOnce([]);
      const result = await handler(validInput, buildCtx());
      expect(result.minSequence).toBeNull();
    });
  });

  // ── Section 4: Limit Default ──────────────────────────────────────────────

  describe("4. Limit Default", () => {
    it("4.1 uses limit=50 when omitted", async () => {
      const ctx = buildCtx();
      const input = { conversationId: CONVERSATION_ID, beforeSequence: 100 }; // no limit
      await handler(input, ctx);
      expect(db.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 51 }) // 50+1
      );
    });
  });

  // ── Section 5: Error Handling Contract ───────────────────────────────────

  describe("5. Error Handling Contract", () => {
    it("5.1 AppError 401 passes through unchanged", async () => {
      const ctx = buildCtx({ authGate: null as any });
      const err: any = await handler(validInput, ctx).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(401);
    });

    it("5.2 non-operational DB error propagates as raw Error (not AppError)", async () => {
      (db.chatMessage.findMany as any).mockRejectedValueOnce(new Error("DB dead"));
      const err: any = await handler(validInput, buildCtx()).catch((e) => e);
      expect(err).not.toBeInstanceOf(AppError);
      expect(err.message).toBe("DB dead");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — Schema Validation (pure, no mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { getHistorySchema } from "./schema";

const VALID_CUID = "clh1234567890abcdefghijk0";

describe("getHistorySchema (Section 6 — Input Validation)", () => {
  it("6.1 accepts valid CUID conversationId", () => {
    expect(() =>
      getHistorySchema.parse({ conversationId: VALID_CUID, beforeSequence: 50 })
    ).not.toThrow();
  });

  it("6.2 rejects non-CUID conversationId", () => {
    expect(() =>
      getHistorySchema.parse({ conversationId: "not-a-cuid", beforeSequence: 50 })
    ).toThrow();
  });

  it("6.3 rejects empty conversationId", () => {
    expect(() =>
      getHistorySchema.parse({ conversationId: "", beforeSequence: 50 })
    ).toThrow();
  });

  it("6.4 rejects missing conversationId", () => {
    expect(() =>
      getHistorySchema.parse({ beforeSequence: 50 })
    ).toThrow();
  });

  it("6.5 rejects non-integer beforeSequence", () => {
    expect(() =>
      getHistorySchema.parse({ conversationId: VALID_CUID, beforeSequence: 1.5 })
    ).toThrow();
  });

  it("6.6 rejects limit > 100", () => {
    expect(() =>
      getHistorySchema.parse({ conversationId: VALID_CUID, beforeSequence: 50, limit: 101 })
    ).toThrow();
  });

  it("6.7 rejects limit < 1", () => {
    expect(() =>
      getHistorySchema.parse({ conversationId: VALID_CUID, beforeSequence: 50, limit: 0 })
    ).toThrow();
  });

  it("6.8 applies default limit=50 when omitted", () => {
    const parsed = getHistorySchema.parse({ conversationId: VALID_CUID, beforeSequence: 50 });
    expect(parsed.limit).toBe(50);
  });
});
