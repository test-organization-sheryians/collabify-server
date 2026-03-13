import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS — declared before module imports
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: {
    chatMessage: { findUnique: mock() },
    messageReaction: { findMany: mock() },
  },
}));

mock.module("@/infra/redis", () => ({
  redis: {},
}));

// Mock the reaction Redis helpers
mock.module("@/modules/chat/domain/reactions/redis-helpers", () => ({
  getReactionCounts: mock(async () => ({})),
  hasUserReacted: mock(async () => false),
  getReactionUsers: mock(async () => ({ userIds: [], nextCursor: null })),
  rebuildReactionCache: mock(async () => {}),
}));

// Mock LockingService — acquire returns false (lock not taken) so cold path is skipped
mock.module("@/services/locking", () => ({
  LockingService: {
    acquire: mock(async () => false),
    release: mock(async () => true),
  },
}));

import { handler } from "./handler";
import { db } from "@/infra/db";
import {
  getReactionCounts,
} from "@/modules/chat/domain/reactions/redis-helpers";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const MESSAGE_ID = "550e8400-e29b-41d4-a716-446655440000"; // UUID
const CONV_ID    = "clh1111111111abcdefghijk0";
const WORKSPACE_ID = "clh2222222222abcdefghijk1";
const USER_ID    = "user_alice123";

const mockChannel = { workspaceId: WORKSPACE_ID };

const validInput = { messageId: MESSAGE_ID };

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const buildCtx = (overrides: Partial<ServiceContext> = {}): ServiceContext =>
  ({
    db: db as any,
    redis: {} as any,
    auth: { userId: USER_ID, sessionId: "sess_test" },
    authGate: {
      getChannel: mock(async () => mockChannel),
      assertChannelMember: mock(async () => {}),
    } as any,
    permissions: {
      assert: mock(async () => {}),
    } as any,
    dataloaders: {
      chat: { userById: { load: mock(async () => null) } },
    } as any,
    loaders: {} as any,
    c: {} as any,
    ...overrides,
  } as unknown as ServiceContext);

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getMessageReactions", () => {
  beforeEach(() => {
    mock.restore();
    (db.chatMessage.findUnique as any).mockResolvedValue({ conversationId: CONV_ID });
    (getReactionCounts as any).mockResolvedValue({});
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

    it("1.3 throws 404 when message does not exist", async () => {
      (db.chatMessage.findUnique as any).mockResolvedValueOnce(null);
      await expect(handler(validInput, buildCtx())).rejects.toMatchObject({ httpStatus: 404 });
    });

    it("1.4 throws 404 when conversation not in channel cache", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => null),
          assertChannelMember: mock(async () => {}),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 404 });
    });

    it("1.5 throws 403 when assertChannelMember rejects", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => mockChannel),
          assertChannelMember: mock(async () => {
            throw AppError.forbidden("Not a member");
          }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 403 });
    });

    it("1.6 throws 403 when conversation:read permission denied", async () => {
      const ctx = buildCtx({
        permissions: {
          assert: mock(async () => {
            throw AppError.forbidden("No read permission");
          }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 403 });
    });
  });

  // ── Section 2: Auth step is pure (single DB query for auth) ──────────────

  describe("2. Step structure", () => {
    it("2.1 resolves conversationId with exactly 1 DB query (fetchMessageConversation)", async () => {
      const findUnique = mock(async () => ({ conversationId: CONV_ID }));
      const ctx = buildCtx({ db: { chatMessage: { findUnique }, messageReaction: { findMany: mock(() => []) } } as any });
      await handler(validInput, ctx);
      expect(findUnique).toHaveBeenCalledTimes(1);
      expect(findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: MESSAGE_ID }, select: { conversationId: true } })
      );
    });

    it("2.2 assertAccess uses conversationId from fetchMessageConversation (not from fetchReactions)", async () => {
      const getChannel = mock(async () => mockChannel);
      const ctx = buildCtx({
        authGate: { getChannel, assertChannelMember: mock(async () => {}) } as any,
      });
      await handler(validInput, ctx);
      expect(getChannel).toHaveBeenCalledWith(CONV_ID);
    });
  });

  // ── Section 3: Success Path (Redis hot path) ──────────────────────────────

  describe("3. Success Path", () => {
    it("3.1 returns empty array when no reactions exist", async () => {
      const result = await handler(validInput, buildCtx());
      expect(result).toEqual([]);
    });
  });

  // ── Section 4: Error Handling Contract ───────────────────────────────────

  describe("4. Error Handling Contract", () => {
    it("4.1 AppError 401 passes through unchanged", async () => {
      const ctx = buildCtx({ authGate: null as any });
      const err: any = await handler(validInput, ctx).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(401);
    });

    it("4.2 AppError 404 (message not found) passes through unchanged", async () => {
      (db.chatMessage.findUnique as any).mockResolvedValueOnce(null);
      const err: any = await handler(validInput, buildCtx()).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(404);
    });

    it("4.3 non-operational DB error propagates as raw Error", async () => {
      (db.chatMessage.findUnique as any).mockRejectedValueOnce(new Error("DB dead"));
      const err: any = await handler(validInput, buildCtx()).catch((e) => e);
      expect(err).not.toBeInstanceOf(AppError);
      expect(err.message).toBe("DB dead");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Schema validation (pure, no mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { getMessageReactionsSchema } from "./schema";

describe("getMessageReactionsSchema (Section 5 — Input Validation)", () => {
  it("5.1 accepts a valid UUID messageId", () => {
    expect(() =>
      getMessageReactionsSchema.parse({ messageId: "550e8400-e29b-41d4-a716-446655440000" })
    ).not.toThrow();
  });

  it("5.2 rejects a non-UUID messageId", () => {
    expect(() =>
      getMessageReactionsSchema.parse({ messageId: "not-a-uuid" })
    ).toThrow();
  });

  it("5.3 rejects missing messageId", () => {
    expect(() => getMessageReactionsSchema.parse({})).toThrow();
  });
});
