import { describe, it, expect, mock, beforeEach } from "bun:test";
import { handler } from "./handler";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import { getLastReadMessageSchema } from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: {
    chatMember: {
      findUnique: mock(),
    },
  },
}));

import { db } from "@/infra/db";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID = "clh1234567890abcdefghijk0";
const USER_ID    = "clh0000000000abcdefghijk1";
const WORKSPACE_ID = "clh9999999999abcdefghijk2";
const PROJECT_ID = "clh1111111111abcdefghijk3";

const mockChannel = { id: CHANNEL_ID, workspaceId: WORKSPACE_ID, projectId: PROJECT_ID };

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

const validInput = { channelId: CHANNEL_ID };

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getLastReadMessage", () => {
  beforeEach(() => {
    mock.restore();
    (db.chatMember.findUnique as any).mockResolvedValue({ lastReadMsgId: "msg_123" });
  });

  // ── Section 1: Auth Gate ──────────────────────────────────────────────────

  describe("1. Auth Gate", () => {
    it("1.1 throws 401 when authGate is missing from context", async () => {
      const ctx = buildCtx({ authGate: null as any });
      await expect(handler(validInput, ctx)).rejects.toThrow(AppError);
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401, code: "UNAUTHORIZED" });
    });

    it("1.2 throws 401 when user is not authenticated", async () => {
      const ctx = buildCtx({ auth: null as any });
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
    it("2.1 returns lastReadMsgId when caller is authorized and has read state", async () => {
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result).toBe("msg_123");
    });

    it("2.2 returns null when caller has no read state", async () => {
      (db.chatMember.findUnique as any).mockResolvedValueOnce({ lastReadMsgId: null });
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result).toBeNull();
    });

    it("2.3 returns null when member record does not exist (defensive)", async () => {
      (db.chatMember.findUnique as any).mockResolvedValueOnce(null);
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result).toBeNull();
    });

    it("2.4 queries DB chatMember correctly with channelId and userId", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMember.findUnique).toHaveBeenCalledWith({
        where: {
          conversationId_userId: {
            conversationId: CHANNEL_ID,
            userId: USER_ID,
          },
        },
        select: {
          lastReadMsgId: true,
        },
      });
    });
  });

  // ── Section 3: Caching ────────────────────────────────────────────────────

  describe("3. Caching", () => {
    it("3.1 calls getChannel once to hit Redis cache", async () => {
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
      (db.chatMember.findUnique as any).mockRejectedValueOnce(new Error("DB Connection Lost"));
      const ctx = buildCtx();
      try {
        await handler(validInput, ctx);
        throw new Error("Should have thrown");
      } catch (err: any) {
        expect(err).not.toBeInstanceOf(AppError);
        expect(err.message).toBe("DB Connection Lost");
      }
    });
  });

  // ── Section 5: Input Validation ───────────────────────────────────────────

  describe("5. Input Validation", () => {
    it("rejects invalid channelId", () => {
      expect(() => getLastReadMessageSchema.parse({ channelId: "not-a-cuid" })).toThrow();
    });

    it("accepts valid schema input", () => {
      expect(() => getLastReadMessageSchema.parse({ channelId: CHANNEL_ID })).not.toThrow();
    });
  });
});
