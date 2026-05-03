import { describe, it, expect, mock, beforeEach } from "bun:test";
import { handler } from "./handler";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import { getMessageByIdSchema } from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: {
    chatMessage: {
      findUnique: mock(),
    },
  },
}));

import { db } from "@/infra/db";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const MESSAGE_ID   = "01HVK1M42XXXXX3S7JXXXY6X0A";
const CHANNEL_ID   = "clh1234567890abcdefghijk0";
const USER_ID      = "clh0000000000abcdefghijk1";
const WORKSPACE_ID = "clh9999999999abcdefghijk2";
const PROJECT_ID   = "clh1111111111abcdefghijk3";

const mockChannel = { id: CHANNEL_ID, workspaceId: WORKSPACE_ID, projectId: PROJECT_ID };

const mockMessage = {
  id: MESSAGE_ID,
  conversationId: CHANNEL_ID,
  authorUserId: USER_ID,
  content: "Hello world!",
  sequence: 1,
  type: "TEXT",
  streamId: null,
  createdAt: new Date(),
  parentMessageId: null,
  metadata: null,
  deletedAt: null,
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

const validInput = { messageId: MESSAGE_ID };

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getMessageById", () => {
  beforeEach(() => {
    mock.restore();
    (db.chatMessage.findUnique as any).mockResolvedValue(mockMessage);
  });

  // ── Section 1: Auth Gate ──────────────────────────────────────────────────

  describe("1. Auth Gate", () => {
    it("1.1 throws 401 BEFORE querying DB when user is not authenticated", async () => {
      const ctx = buildCtx({ auth: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401, code: "UNAUTHORIZED" });
      expect(db.chatMessage.findUnique).not.toHaveBeenCalled();
    });

    it("1.2 throws 404 when message is not found", async () => {
      (db.chatMessage.findUnique as any).mockResolvedValueOnce(null);
      const ctx = buildCtx();
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 404, code: "MESSAGE_NOT_FOUND" });
    });

    it("1.3 throws 401 when authGate is missing from context", async () => {
      const ctx = buildCtx({ authGate: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401, code: "UNAUTHORIZED" });
    });

    it("1.4 throws 404 when conversation does not exist", async () => {
      const ctx = buildCtx({
        authGate: { getChannel: mock(async () => null), assertChannelMember: mock() } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 404, code: "CHANNEL_NOT_FOUND" });
    });

    it("1.5 throws 400 when channel does not belong to a project", async () => {
      const ctx = buildCtx({
        authGate: { getChannel: mock(async () => ({ ...mockChannel, projectId: null })), assertChannelMember: mock() } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 400, code: "INVALID_CHANNEL_TYPE" });
    });

    it("1.6 throws 403 when caller is not a channel member", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => mockChannel),
          assertChannelMember: mock(async () => { throw AppError.forbidden("Not a member", "FORBIDDEN"); }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 403, code: "FORBIDDEN" });
    });

    it("1.7 throws 403 when permission check fails", async () => {
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
    it("2.1 returns message when caller is authorized and message exists", async () => {
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result).toEqual(mockMessage as any);
    });

    it("2.2 queries DB chatMessage correctly with messageId", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.findUnique).toHaveBeenCalledWith({
        where: { id: MESSAGE_ID },
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
      (db.chatMessage.findUnique as any).mockRejectedValueOnce(new Error("DB Dead"));
      const ctx = buildCtx();
      try {
        await handler(validInput, ctx);
        throw new Error("Should have thrown");
      } catch (err: any) {
        expect(err).not.toBeInstanceOf(AppError);
        expect(err.message).toBe("DB Dead");
      }
    });
  });

  // ── Section 5: Input Validation ───────────────────────────────────────────

  describe("5. Input Validation", () => {
    it("rejects invalid messageId (not a ULID)", () => {
      expect(() => getMessageByIdSchema.parse({ messageId: "invalid-id" })).toThrow();
    });

    it("accepts valid schema input with real ULID", () => {
      expect(() => getMessageByIdSchema.parse({ messageId: "01HVK1M42E8JX8N2X5JXXXY6X0" })).not.toThrow();
    });
  });
});
