import { describe, it, expect, mock, beforeEach } from "bun:test";
import { handler } from "./handler";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import { getMessagesAfterCursorSchema } from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: {
    chatMessage: {
      findMany: mock(),
    },
  },
}));

import { db } from "@/infra/db";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID   = "clh1234567890abcdefghijk0";
const USER_ID      = "clh0000000000abcdefghijk1";
const WORKSPACE_ID = "clh9999999999abcdefghijk2";
const PROJECT_ID   = "clh1111111111abcdefghijk3";
const CURSOR_ULID  = "01HVK1M42XXXXX3S7JXXXY6X0A";

const mockChannel = { id: CHANNEL_ID, workspaceId: WORKSPACE_ID, projectId: PROJECT_ID };

const mockMessageRow = {
  id: "01HVK1M42XXXXX3S7JXXXY6X0B",
  conversationId: CHANNEL_ID,
  authorUserId: USER_ID,
  content: "Following message",
  type: "TEXT",
  sequence: 2,
  streamId: null,
  createdAt: new Date(),
  deletedAt: null,
  metadata: null,
  parentMessageId: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

const buildCtx = (overrides: Partial<ServiceContext> = {}): ServiceContext => ({
  db: db as any,
  auth: { userId: USER_ID, sessionId: "session_1" },
  authGate: {
    getChannel: mock(async () => mockChannel),
    assertChannelMember: mock(async () => {}),
  } as any,
  permissions: {
    assert: mock(async () => {}),
  } as any,
  loaders: {} as any,
  c: {} as any,
  ...overrides,
} as unknown as ServiceContext);

const validInput = { channelId: CHANNEL_ID, afterCursor: CURSOR_ULID, limit: 10 };

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getMessagesAfterCursor", () => {
  beforeEach(() => {
    mock.restore();
    (db.chatMessage.findMany as any).mockResolvedValue([mockMessageRow]);
  });

  // ── Section 1: Auth Gate ──────────────────────────────────────────────────

  describe("1. Auth Gate", () => {
    it("1.1 throws 401 BEFORE querying DB when user is not authenticated", async () => {
      const ctx = buildCtx({ auth: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401, code: "UNAUTHORIZED" });
      expect(db.chatMessage.findMany).not.toHaveBeenCalled();
    });

    it("1.2 throws 401 when authGate is missing from context", async () => {
      const ctx = buildCtx({ authGate: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401, code: "UNAUTHORIZED" });
    });

    it("1.3 throws 404 when channel does not exist", async () => {
      const ctx = buildCtx({
        authGate: { getChannel: mock(async () => null), assertChannelMember: mock() } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 404, code: "CHANNEL_NOT_FOUND" });
    });

    it("1.4 throws 400 when channel does not belong to a project", async () => {
      const ctx = buildCtx({
        authGate: { getChannel: mock(async () => ({ ...mockChannel, projectId: null })), assertChannelMember: mock() } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 400, code: "INVALID_CHANNEL_TYPE" });
    });

    it("1.5 throws 403 when caller is not a channel member", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => mockChannel),
          assertChannelMember: mock(async () => { throw AppError.forbidden("Not a member", "FORBIDDEN"); }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 403, code: "FORBIDDEN" });
    });

    it("1.6 throws 403 when permission check fails", async () => {
      const ctx = buildCtx({
        permissions: {
          assert: mock(async () => { throw AppError.forbidden("Missing permission", "FORBIDDEN"); }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 403, code: "FORBIDDEN" });
    });
  });

  // ── Section 2: Success Path ───────────────────────────────────────────────

  describe("2. Success Path", () => {
    it("2.1 returns subsequent messages when caller is authorized", async () => {
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result).toEqual([mockMessageRow as any]);
    });

    it("2.2 queries DB chatMessage correctly with cursor skip and correct sort", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.findMany).toHaveBeenCalledWith({
        where: { conversationId: CHANNEL_ID },
        take: 10,
        skip: 1,
        cursor: { id: CURSOR_ULID },
        orderBy: { createdAt: "asc" },
        select: expect.any(Object),
      });
    });
  });

  // ── Section 3: Caching ────────────────────────────────────────────────────

  describe("3. Caching", () => {
    it("3.1 calls getChannel to hit Redis cache instead of DB", async () => {
      const getChannel = mock(async () => mockChannel);
      const ctx = buildCtx({ authGate: { getChannel, assertChannelMember: mock(async () => {}) } as any });
      await handler(validInput, ctx);
      expect(getChannel).toHaveBeenCalledTimes(1);
      expect(getChannel).toHaveBeenCalledWith(CHANNEL_ID);
    });
  });

  // ── Section 4: Error Propagation ──────────────────────────────────────────

  describe("4. Error Propagation", () => {
    it("4.1 propagates DB errors natively", async () => {
      (db.chatMessage.findMany as any).mockRejectedValueOnce(new Error("DB Connection Error"));
      const ctx = buildCtx();
      try {
        await handler(validInput, ctx);
        throw new Error("Should have thrown");
      } catch (err: any) {
        expect(err).not.toBeInstanceOf(AppError);
        expect(err.message).toBe("DB Connection Error");
      }
    });
  });

  // ── Section 5: Input Validation ───────────────────────────────────────────

  describe("5. Input Validation", () => {
    it("rejects invalid afterCursor (not a ULID)", () => {
      expect(() => getMessagesAfterCursorSchema.parse({ ...validInput, afterCursor: "invalid" })).toThrow();
    });

    it("rejects invalid limit (too high)", () => {
      expect(() => getMessagesAfterCursorSchema.parse({ ...validInput, limit: 101 })).toThrow();
    });

    it("accepts valid schema input with real ULID and limit defaults to 50", () => {
      const parsed = getMessagesAfterCursorSchema.parse({ channelId: CHANNEL_ID, afterCursor: CURSOR_ULID });
      expect(parsed.limit).toBe(50);
    });
  });
});
