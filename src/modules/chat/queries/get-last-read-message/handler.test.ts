import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: { chatMember: { findUnique: mock() } },
}));

mock.module("@/infra/redis", () => ({
  redis: { get: mock(), set: mock() },
}));

import { handler } from "./handler";
import { db } from "@/infra/db";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID    = "clh1111111111abcdefghijk0";
const WORKSPACE_ID  = "clh2222222222abcdefghijk1";
const USER_ID       = "clh3333333333abcdefghijk2";
const LAST_READ_ID  = "clh4444444444abcdefghijk3";

const validInput = { channelId: CHANNEL_ID };

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const buildCtx = (overrides: Partial<ServiceContext> = {}): ServiceContext =>
  ({
    db: db as any,
    auth: { userId: USER_ID, sessionId: "sess_test" },
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

describe("getLastReadMessage", () => {
  beforeEach(() => {
    (db.chatMember.findUnique as any).mockResolvedValue({
      lastReadMsgId: LAST_READ_ID,
    });
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

    it("1.3 throws 404 when channel does not exist", async () => {
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

    it("1.6 passes workspace scope to permissions.assert", async () => {
      const assert = mock(async () => {});
      const ctx = buildCtx({ permissions: { assert } as any });
      await handler(validInput, ctx);
      expect(assert).toHaveBeenCalledWith(
        "conversation:read",
        { type: "workspace", id: WORKSPACE_ID }
      );
    });
  });

  // ── Section 2: Success Path ───────────────────────────────────────────────

  describe("2. Success Path", () => {
    it("2.1 returns lastReadMsgId when member has read state", async () => {
      const result = await handler(validInput, buildCtx());
      expect(result).toBe(LAST_READ_ID);
    });

    it("2.2 returns null when member has no lastReadMsgId", async () => {
      (db.chatMember.findUnique as any).mockResolvedValueOnce({ lastReadMsgId: null });
      const result = await handler(validInput, buildCtx());
      expect(result).toBeNull();
    });

    it("2.3 returns null when chatMember row does not exist", async () => {
      (db.chatMember.findUnique as any).mockResolvedValueOnce(null);
      const result = await handler(validInput, buildCtx());
      expect(result).toBeNull();
    });

    it("2.4 queries with correct composite key", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMember.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            conversationId_userId: {
              conversationId: CHANNEL_ID,
              userId: USER_ID,
            },
          },
        })
      );
    });

    it("2.5 selects only lastReadMsgId (no over-fetch)", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMember.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { lastReadMsgId: true },
        })
      );
    });
  });

  // ── Section 3: Error Handling Contract ───────────────────────────────────

  describe("3. Error Handling Contract", () => {
    it("3.1 AppError 401 passes through unchanged", async () => {
      const ctx = buildCtx({ authGate: null as any });
      const err: any = await handler(validInput, ctx).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(401);
    });

    it("3.2 non-operational DB error propagates as raw Error (logged)", async () => {
      (db.chatMember.findUnique as any).mockRejectedValueOnce(new Error("DB dead"));
      const err: any = await handler(validInput, buildCtx()).catch((e) => e);
      expect(err).not.toBeInstanceOf(AppError);
      expect(err.message).toBe("DB dead");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Schema Validation (pure, no mocks)
// ─────────────────────────────────────────────────────────────────────────────

import { getLastReadMessageSchema } from "./schema";

const VALID_CUID = "clh1234567890abcdefghijk0";

describe("getLastReadMessageSchema (Section 4 — Input Validation)", () => {
  it("4.1 accepts valid CUID channelId", () => {
    expect(() =>
      getLastReadMessageSchema.parse({ channelId: VALID_CUID })
    ).not.toThrow();
  });

  it("4.2 rejects non-CUID channelId", () => {
    expect(() =>
      getLastReadMessageSchema.parse({ channelId: "not-a-cuid" })
    ).toThrow();
  });

  it("4.3 rejects missing channelId", () => {
    expect(() => getLastReadMessageSchema.parse({})).toThrow();
  });
});
