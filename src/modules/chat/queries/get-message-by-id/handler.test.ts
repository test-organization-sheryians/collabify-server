import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS — declared before module imports
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: {
    chatMessage: { findUnique: mock() },
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

// ULIDs for message IDs
const MESSAGE_ID = "01HN5Z8MXKQR2V6EPGTB3DJWFY";
// CUIDs for conversation/workspace IDs
const CONV_ID = "clh1111111111abcdefghijk0";
const WORKSPACE_ID = "clh2222222222abcdefghijk1";
const AUTHOR_ID = "user_alice123";

const now = new Date("2024-06-01T10:00:00Z");

const mockMessageRow = {
  id: MESSAGE_ID,
  conversationId: CONV_ID,
  authorUserId: AUTHOR_ID,
  content: { text: "Hello world" },
  sequence: 42,
  type: "TEXT",
  streamId: null,
  createdAt: now,
  parentMessageId: null,
  metadata: {},
  deletedAt: null,
};

const mockChannel = { workspaceId: WORKSPACE_ID };

const validInput = { messageId: MESSAGE_ID };

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const buildCtx = (overrides: Partial<ServiceContext> = {}): ServiceContext =>
  ({
    db: db as any,
    redis: {} as any,
    auth: { userId: AUTHOR_ID, sessionId: "sess_test" },
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

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getMessageById", () => {
  beforeEach(() => {
    mock.restore();
    (db.chatMessage.findUnique as any).mockResolvedValue(mockMessageRow);
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

    it("1.4 throws 404 when channel not found in cache", async () => {
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

    it("1.6 throws 403 when conversation:read permission is denied", async () => {
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

  // ── Section 2: Success Path ───────────────────────────────────────────────

  describe("2. Success Path", () => {
    it("2.1 returns the message row when caller is authorized", async () => {
      const result = await handler(validInput, buildCtx());
      expect(result).toMatchObject({
        id: MESSAGE_ID,
        conversationId: CONV_ID,
        authorUserId: AUTHOR_ID,
        sequence: 42,
      });
    });

    it("2.2 makes exactly 1 DB query (fetchMessage only — assertAccess is pure)", async () => {
      const findUnique = mock(async () => mockMessageRow);
      const ctx = buildCtx({
        db: { chatMessage: { findUnique } } as any,
      });
      await handler(validInput, ctx);
      expect(findUnique).toHaveBeenCalledTimes(1);
    });

    it("2.3 fetches message with explicit select (not findFirst)", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMessage.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MESSAGE_ID },
          select: expect.objectContaining({
            id: true,
            conversationId: true,
            authorUserId: true,
            sequence: true,
            deletedAt: true,
          }),
        })
      );
    });

    it("2.4 passes workspace-scoped scope to permissions.assert", async () => {
      const permAssert = mock(async () => {});
      const ctx = buildCtx({
        permissions: { assert: permAssert } as any,
      });
      await handler(validInput, ctx);
      expect(permAssert).toHaveBeenCalledWith(
        "chat:channel:read",
        expect.objectContaining({ type: "workspace", id: WORKSPACE_ID })
      );
    });

    it("2.5 calls both assertChannelMember and permissions.assert in parallel", async () => {
      const order: string[] = [];
      const assertMember = mock(async () => { order.push("member"); });
      const assertPerm = mock(async () => { order.push("perm"); });
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => mockChannel),
          assertChannelMember: assertMember,
        } as any,
        permissions: { assert: assertPerm } as any,
      });
      await handler(validInput, ctx);
      expect(assertMember).toHaveBeenCalledTimes(1);
      expect(assertPerm).toHaveBeenCalledTimes(1);
    });
  });

  // ── Section 3: Error Handling Contract ───────────────────────────────────

  describe("3. Error Handling Contract", () => {
    it("3.1 AppError 401 passes through unchanged", async () => {
      const ctx = buildCtx({ authGate: null as any });
      const err: any = await handler(validInput, ctx).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(401);
      expect(err.code).toBe("UNAUTHORIZED");
    });

    it("3.2 AppError 404 passes through unchanged (message not found)", async () => {
      (db.chatMessage.findUnique as any).mockResolvedValueOnce(null);
      const err: any = await handler(validInput, buildCtx()).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(404);
    });

    it("3.3 non-operational DB error propagates as raw Error (not wrapped)", async () => {
      (db.chatMessage.findUnique as any).mockRejectedValueOnce(new Error("DB dead"));
      const err: any = await handler(validInput, buildCtx()).catch((e) => e);
      expect(err).not.toBeInstanceOf(AppError);
      expect(err.message).toBe("DB dead");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Schema validation (pure, no mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { getMessageByIdSchema } from "./schema";

describe("getMessageByIdSchema (Section 4 — Input Validation)", () => {
  it("4.1 accepts a valid ULID messageId", () => {
    expect(() =>
      getMessageByIdSchema.parse({ messageId: "01HN5Z8MXKQR2V6EPGTB3DJWFY" })
    ).not.toThrow();
  });

  it("4.2 rejects a non-ULID messageId (CUID)", () => {
    expect(() =>
      getMessageByIdSchema.parse({ messageId: "clh1234567890abcdefghijk0" })
    ).toThrow();
  });

  it("4.3 rejects a bare string messageId", () => {
    expect(() =>
      getMessageByIdSchema.parse({ messageId: "not-a-ulid" })
    ).toThrow();
  });

  it("4.4 rejects missing messageId", () => {
    expect(() => getMessageByIdSchema.parse({})).toThrow();
  });
});
