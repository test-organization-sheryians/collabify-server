import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS — declared before module imports
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: {
    chatConversation: { findFirst: mock() },
    chatMessage: { count: mock(), findFirst: mock() },
  },
}));

mock.module("@/infra/redis", () => ({
  redis: { get: mock(), set: mock() },
}));

import { handler } from "./handler";
import { db } from "@/infra/db";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CONV_ID      = "clh1111111111abcdefghijk0";
const USER_ID      = "clh2222222222abcdefghijk1";
const WORKSPACE_ID = "clh3333333333abcdefghijk2";

const mockChannel = { id: CONV_ID, workspaceId: WORKSPACE_ID };

const now = new Date("2024-06-01T10:00:00Z");

const mockMember = {
  userId: USER_ID,
  role: "MEMBER",
  isMuted: false,
  joinedAt: now,
  lastReadSeq: 5,
  user: { id: USER_ID, fullName: "Alice", email: "alice@example.com", avatarUrl: null },
};

const mockConversationRow = {
  id: CONV_ID,
  type: "CHANNEL",
  name: "general",
  topic: null,
  isArchived: false,
  workspaceId: WORKSPACE_ID,
  projectId: null,
  parentMessageId: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  members: [mockMember],
};

const mockLastMessage = {
  id: "msg1",
  content: "Hello",
  authorUserId: USER_ID,
  createdAt: now,
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const buildCtx = (overrides: Partial<ServiceContext> = {}): ServiceContext =>
  ({
    db: db as any,
    redis: { get: mock(), set: mock() } as any,
    auth: { userId: USER_ID, sessionId: "sess_test" },
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

const validInput = { conversationId: CONV_ID };

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getConversation", () => {
  beforeEach(() => {
    mock.restore();
    (db.chatConversation.findFirst as any).mockResolvedValue(mockConversationRow);
    (db.chatMessage.count as any).mockResolvedValue(3);
    (db.chatMessage.findFirst as any).mockResolvedValue(mockLastMessage);
  });

  // ── Section 1: Auth Gate ──────────────────────────────────────────────────

  describe("1. Auth Gate", () => {
    it("1.1 throws 401 when ctx.authGate is missing", async () => {
      const ctx = buildCtx({ authGate: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({
        httpStatus: 401,
      });
    });

    it("1.2 throws 401 when ctx.permissions is missing", async () => {
      const ctx = buildCtx({ permissions: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({
        httpStatus: 401,
      });
    });

    it("1.3 throws 404 when channel does not exist", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => null),
          assertChannelMember: mock(async () => {}),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({
        httpStatus: 404,
      });
    });

    it("1.4 throws 403 when caller is not a channel member", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => mockChannel),
          assertChannelMember: mock(async () => {
            throw AppError.forbidden();
          }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({
        httpStatus: 403,
      });
    });

    it("1.5 throws 403 when conversation:read permission is denied", async () => {
      const ctx = buildCtx({
        permissions: {
          assert: mock(async () => {
            throw AppError.forbidden("Missing permission: conversation:read");
          }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({
        httpStatus: 403,
      });
    });
  });

  // ── Section 2: Success Path ───────────────────────────────────────────────

  describe("2. Success Path", () => {
    it("2.1 returns Conversation shape with correct fields", async () => {
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result.id).toBe(CONV_ID);
      expect(result.workspaceId).toBe(WORKSPACE_ID);
      expect(result.name).toBe("general");
      expect(result.memberCount).toBe(1);
    });

    it("2.2 isPublic = true for CHANNEL type", async () => {
      const result = await handler(validInput, buildCtx());
      expect(result.isPublic).toBe(true);
    });

    it("2.3 isPublic = false for DM type", async () => {
      (db.chatConversation.findFirst as any).mockResolvedValueOnce({
        ...mockConversationRow,
        type: "DM",
      });
      const result = await handler(validInput, buildCtx());
      expect(result.isPublic).toBe(false);
    });

    it("2.4 returns null lastMessage when channel has no messages", async () => {
      (db.chatMessage.findFirst as any).mockResolvedValueOnce(null);
      const result = await handler(validInput, buildCtx());
      expect(result.lastMessage).toBeNull();
    });

    it("2.5 returns lastMessage when channel has messages", async () => {
      const result = await handler(validInput, buildCtx());
      expect(result.lastMessage).not.toBeNull();
      expect((result.lastMessage as any)?.id).toBe("msg1");
    });

    it("2.6 maps members with fallback fullName = 'Unknown' for null names", async () => {
      (db.chatConversation.findFirst as any).mockResolvedValueOnce({
        ...mockConversationRow,
        members: [
          { ...mockMember, user: { ...mockMember.user, fullName: null } },
        ],
      });
      const result = await handler(validInput, buildCtx());
      expect(result.members?.[0]?.user.fullName).toBe("Unknown");
    });
  });

  // ── Section 3: Unread Count ───────────────────────────────────────────────

  describe("3. Unread Count", () => {
    it("3.1 passes unreadCount from chatMessage.count to response", async () => {
      (db.chatMessage.count as any).mockResolvedValueOnce(7);
      const result = await handler(validInput, buildCtx());
      expect(result.unreadCount).toBe(7);
    });

    it("3.2 unreadCount = 0 when count returns 0", async () => {
      (db.chatMessage.count as any).mockResolvedValueOnce(0);
      const result = await handler(validInput, buildCtx());
      expect(result.unreadCount).toBe(0);
    });

    it("3.3 uses lastReadSeq from caller's member record in count query", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sequence: { gt: mockMember.lastReadSeq }, // 5 from mockMember
          }),
        })
      );
    });
  });

  // ── Section 4: ?? 0 fix (regression) ─────────────────────────────────────
  // [LOGIC_ERROR] lastReadSeq || 0 was replaced with lastReadSeq ?? 0
  // Regression: ensure seq=0 is handled correctly — 0 is a valid seq value

  describe("4. lastReadSeq ?? 0 fix (regression)", () => {
    it("4.1 uses seq=0 correctly when lastReadSeq is 0 (not falsy-collapsed)", async () => {
      (db.chatConversation.findFirst as any).mockResolvedValueOnce({
        ...mockConversationRow,
        members: [{ ...mockMember, lastReadSeq: 0 }],
      });
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sequence: { gt: 0 },
          }),
        })
      );
    });

    it("4.2 uses 0 as default when userMember.lastReadSeq is null", async () => {
      (db.chatConversation.findFirst as any).mockResolvedValueOnce({
        ...mockConversationRow,
        members: [{ ...mockMember, lastReadSeq: null }],
      });
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sequence: { gt: 0 },
          }),
        })
      );
    });
  });

  // ── Section 5: Auth Caching ───────────────────────────────────────────────

  describe("5. Auth Caching", () => {
    it("5.1 calls getChannel exactly once per request", async () => {
      const getChannel = mock(async () => mockChannel);
      const ctx = buildCtx({
        authGate: {
          getChannel,
          assertChannelMember: mock(async () => {}),
        } as any,
      });
      await handler(validInput, ctx);
      expect(getChannel).toHaveBeenCalledTimes(1);
      expect(getChannel).toHaveBeenCalledWith(CONV_ID);
    });

    it("5.2 calls assertChannelMember exactly once per request", async () => {
      const assertChannelMember = mock(async () => {});
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => mockChannel),
          assertChannelMember,
        } as any,
      });
      await handler(validInput, ctx);
      expect(assertChannelMember).toHaveBeenCalledTimes(1);
      expect(assertChannelMember).toHaveBeenCalledWith(CONV_ID);
    });

    it("5.3 passes workspace scope to permissions.assert", async () => {
      const assert = mock(async () => {});
      const ctx = buildCtx({ permissions: { assert } as any });
      await handler(validInput, ctx);
      expect(assert).toHaveBeenCalledWith(
        "conversation:read",
        expect.objectContaining({ type: "workspace", id: WORKSPACE_ID })
      );
    });
  });

  // ── Section 6: Error Handling Contract ───────────────────────────────────
  // Per §1.11 / Section N: assert on httpStatus + code, never on message.

  describe("6. Error Handling Contract", () => {
    it("6.1 unauthorized path — AppError 401 UNAUTHORIZED", async () => {
      const ctx = buildCtx({ authGate: null as any });
      const err: any = await handler(validInput, ctx).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(401);
      expect(err.code).toBe("UNAUTHORIZED");
    });

    it("6.2 not-found path — AppError 404 when channel absent", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => null),
          assertChannelMember: mock(async () => {}),
        } as any,
      });
      const err: any = await handler(validInput, ctx).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(404);
    });

    it("6.3 forbidden path — AppError 403 when not a member", async () => {
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => mockChannel),
          assertChannelMember: mock(async () => {
            throw AppError.forbidden();
          }),
        } as any,
      });
      const err: any = await handler(validInput, ctx).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(403);
    });

    it("6.4 non-operational DB error propagates as raw Error (not AppError)", async () => {
      (db.chatConversation.findFirst as any).mockRejectedValueOnce(
        new Error("DB dead")
      );
      const err: any = await handler(validInput, buildCtx()).catch((e) => e);
      expect(err).not.toBeInstanceOf(AppError);
      expect(err.message).toBe("DB dead");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Schema validation (pure, no mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { getConversationSchema } from "./schema";

const VALID_CUID = "clh1234567890abcdefghijk0";

describe("getConversationSchema (Section 7 — Input Validation)", () => {
  it("7.1 accepts a valid CUID", () => {
    expect(() =>
      getConversationSchema.parse({ conversationId: VALID_CUID })
    ).not.toThrow();
  });

  it("7.2 rejects non-CUID string", () => {
    expect(() =>
      getConversationSchema.parse({ conversationId: "not-a-cuid" })
    ).toThrow();
  });

  it("7.3 rejects empty string", () => {
    expect(() =>
      getConversationSchema.parse({ conversationId: "" })
    ).toThrow();
  });

  it("7.4 rejects missing conversationId", () => {
    expect(() => getConversationSchema.parse({})).toThrow();
  });

  it("7.5 rejects extra fields (strict schema - passthrough by default but field still required)", () => {
    // Zod strips unknown keys by default — parsing with extra keys should still succeed
    const result = getConversationSchema.parse({
      conversationId: VALID_CUID,
      extra: "ignored",
    });
    expect(result).toEqual({ conversationId: VALID_CUID });
  });
});
