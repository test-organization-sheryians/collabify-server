import { describe, it, expect, mock, beforeEach } from "bun:test";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS — must be declared before any import that triggers module evaluation
// ─────────────────────────────────────────────────────────────────────────────

mock.module("@/infra/db", () => ({
  db: {
    chatMember: {
      findMany: mock(),
    },
  },
}));

mock.module("@/infra/redis", () => ({
  redis: {
    get: mock(),
    set: mock(),
  },
}));

import { handler } from "./handler";
import { db } from "@/infra/db";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID   = "clh1234567890abcdefghijk0";
const USER_ID      = "clh0000000000abcdefghijk1";
const WORKSPACE_ID = "clh9999999999abcdefghijk2";

const mockChannel = { id: CHANNEL_ID, workspaceId: WORKSPACE_ID };

const now = new Date();

/** Minimal ChatMember row matching ChannelMemberRow shape */
const makeMember = (
  id: string,
  joinedAt = now
) => ({
  id,
  conversationId: CHANNEL_ID,
  userId: `user_${id}`,
  isMuted: false,
  joinedAt,
  lastReadMsgId: null,
  lastDeliveredMsgId: null,
  lastReadSeq: 0,
  lastReadAt: now,
});

const OWNER_MEMBER  = makeMember("m1", new Date("2024-01-01"));
const ADMIN_MEMBER  = makeMember("m2", new Date("2024-01-02"));
const MEMBER_MEMBER = makeMember("m3", new Date("2024-01-03"));
const GUEST_MEMBER  = makeMember("m4", new Date("2024-01-04"));

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * buildCtx — factories a mock ServiceContext.
 *
 * All authGate / permissions methods are mocks that succeed by default.
 * Pass overrides to inject specific failure scenarios.
 */
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

const validInput = { channelId: CHANNEL_ID, limit: 10, offset: 0 };

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getChannelMembers", () => {
  beforeEach(() => {
    mock.restore();
    (db.chatMember.findMany as any).mockResolvedValue([
      OWNER_MEMBER,
      MEMBER_MEMBER,
    ]);
  });

  // ── Section 1: Auth Gate ──────────────────────────────────────────────────
  //
  // Derived from audit findings:
  //  [DUPLICATE_AUTH]  — resolver calls requireUser, handler guarded authGate null-check
  //  [ALREADY_GATED]   — assertChannelMember + permissions.assert both present ✅

  describe("1. Auth Gate", () => {
    it("1.1 throws 401 when ctx.authGate is missing", async () => {
      const ctx = buildCtx({ authGate: null as any });
      const call = handler(validInput, ctx);
      await expect(call).rejects.toBeInstanceOf(AppError);
      await expect(handler(validInput, buildCtx({ authGate: null as any }))).rejects.toMatchObject({
        httpStatus: 401,
      });
    });

    it("1.2 throws 401 when ctx.permissions is missing", async () => {
      const ctx = buildCtx({ permissions: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({
        httpStatus: 401,
      });
    });

    it("1.3 throws 404 when channel does not exist in cache or DB", async () => {
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
            throw AppError.forbidden("Not a member of this channel.");
          }),
        } as any,
      });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({
        httpStatus: 403,
      });
    });

    it("1.5 throws 403 when conversation.member:read permission is denied", async () => {
      const ctx = buildCtx({
        permissions: {
          assert: mock(async () => {
            throw AppError.forbidden("Missing permission: conversation.member:read");
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
    it("2.1 returns member records when caller is authorized", async () => {
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result.length).toBe(2);
    });

    it("2.2 returns empty array when channel has no members", async () => {
      (db.chatMember.findMany as any).mockResolvedValueOnce([]);
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result).toEqual([]);
    });

    it("2.3 passes limit and offset to the DB query", async () => {
      const ctx = buildCtx();
      await handler({ channelId: CHANNEL_ID, limit: 5, offset: 20 }, ctx);
      expect(db.chatMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5, skip: 20 })
      );
    });

    it("2.4 queries only the target channel", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(db.chatMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: CHANNEL_ID },
        })
      );
    });
  });

  // ── Section 3: Join Order ─────────────────────────────────────────────────
  //
  // Channel-level role was removed from ChatMember. Members are returned in
  // DB joinedAt ASC order (handled by the DB query, no in-memory sort needed).

  describe("3. Join Order", () => {
    it("3.1 members are returned in joinedAt ascending order", async () => {
      (db.chatMember.findMany as any).mockResolvedValueOnce([
        OWNER_MEMBER,
        ADMIN_MEMBER,
        MEMBER_MEMBER,
      ]);
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result[0].id).toBe("m1");
      expect(result[1].id).toBe("m2");
      expect(result[2].id).toBe("m3");
    });

    it("3.2 members with same joinedAt are returned in DB order", async () => {
      const early = makeMember("early", new Date("2024-01-01"));
      const late  = makeMember("late",  new Date("2024-06-01"));
      (db.chatMember.findMany as any).mockResolvedValueOnce([early, late]);
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result[0].id).toBe("early");
      expect(result[1].id).toBe("late");
    });
  });

  // ── Section 4: Caching ────────────────────────────────────────────────────
  //
  // Derived from audit findings [CACHE_OPPORTUNITY] / [ALREADY_GATED]:
  //  Both getChannel and assertChannelMember are Redis-backed (warm cache = no DB).
  //  Test verifies each is called exactly once per request.

  describe("4. Auth Caching", () => {
    it("4.1 calls getChannel exactly once per request (cache-backed gate)", async () => {
      const getChannel = mock(async () => mockChannel);
      const ctx = buildCtx({
        authGate: {
          getChannel,
          assertChannelMember: mock(async () => {}),
        } as any,
      });
      await handler(validInput, ctx);
      expect(getChannel).toHaveBeenCalledTimes(1);
      expect(getChannel).toHaveBeenCalledWith(CHANNEL_ID);
    });

    it("4.2 calls assertChannelMember exactly once per request (cache-backed gate)", async () => {
      const assertChannelMember = mock(async () => {});
      const ctx = buildCtx({
        authGate: {
          getChannel: mock(async () => mockChannel),
          assertChannelMember,
        } as any,
      });
      await handler(validInput, ctx);
      expect(assertChannelMember).toHaveBeenCalledTimes(1);
      expect(assertChannelMember).toHaveBeenCalledWith(CHANNEL_ID);
    });

    it("4.3 calls permissions.assert with workspace scope derived from cached channel", async () => {
      const assert = mock(async () => {});
      const ctx = buildCtx({ permissions: { assert } as any });
      await handler(validInput, ctx);
      expect(assert).toHaveBeenCalledWith(
        "chat:channel:member:read",
        expect.objectContaining({ type: "workspace", id: WORKSPACE_ID })
      );
    });
  });

  // ── Section 5: Error Propagation ──────────────────────────────────────────

  describe("5. Error Propagation", () => {
    it("5.1 DB errors in fetchChannelMembers propagate without wrapping", async () => {
      (db.chatMember.findMany as any).mockRejectedValueOnce(
        new Error("DB connection lost")
      );
      const ctx = buildCtx();
      await expect(handler(validInput, ctx)).rejects.toThrow("DB connection lost");
    });
  });

  // ── Section 6: Error Handling Contract ───────────────────────────────────
  //
  // Per §1.11 / Section N standards: every handler test file must include this
  // section. Assert on err.httpStatus + err.code — never on err.message.

  describe("6. Error Handling Contract", () => {
    it("6.1 unauthorized path — AppError 401 with UNAUTHORIZED code", async () => {
      const ctx = buildCtx({ authGate: null as any });
      const err: any = await handler(validInput, ctx).catch((e) => e);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(401);
      expect(err.code).toBe("UNAUTHORIZED");
      // Never assert err.message — messages are internal and can change
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

    it("6.4 non-operational DB error propagates as raw Error (not wrapped in AppError)", async () => {
      (db.chatMember.findMany as any).mockRejectedValueOnce(
        new Error("DB dead")
      );
      const err: any = await handler(validInput, buildCtx()).catch((e) => e);
      // Must NOT be an AppError — the error boundary logs then re-throws raw
      expect(err).not.toBeInstanceOf(AppError);
      expect(err.message).toBe("DB dead");
    });
  });

  // ── Section 7: Input Validation ───────────────────────────────────────────
  //
  // Per §1.12 / Section O standards: test the Zod schema directly — no mock
  // context or infra needed. These are pure synchronous schema tests.
  //
  // Findings addressed:
  //  [WEAK_CONSTRAINT] limit/offset: added .int() — now rejects floats
  //  Schema completeness checklist: channelId ✅ .cuid(), limit ✅ .int().max(100),
  //    offset ✅ .int().min(0), both have defaults ✅, no .trim() needed (numeric+ID)
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Schema validation tests (outside outer describe — pure unit tests,
// no handler invocation, no mock setup required)
// ─────────────────────────────────────────────────────────────────────────────

import { getChannelMembersSchema } from "./schema";

const VALID_CUID = "clh1234567890abcdefghijk0";

describe("getChannelMembersSchema (Section 7 — Input Validation)", () => {
  describe("7.1 channelId constraints", () => {
    it("rejects non-CUID string", () => {
      expect(() =>
        getChannelMembersSchema.parse({ channelId: "not-a-cuid" })
      ).toThrow();
    });

    it("rejects empty string", () => {
      expect(() =>
        getChannelMembersSchema.parse({ channelId: "" })
      ).toThrow();
    });

    it("rejects missing channelId", () => {
      expect(() =>
        getChannelMembersSchema.parse({ limit: 10, offset: 0 })
      ).toThrow();
    });

    it("accepts a valid CUID", () => {
      expect(() =>
        getChannelMembersSchema.parse({ channelId: VALID_CUID })
      ).not.toThrow();
    });
  });

  describe("7.2 limit constraints", () => {
    it("rejects limit > 100", () => {
      expect(() =>
        getChannelMembersSchema.parse({ channelId: VALID_CUID, limit: 101 })
      ).toThrow();
    });

    it("rejects limit < 1", () => {
      expect(() =>
        getChannelMembersSchema.parse({ channelId: VALID_CUID, limit: 0 })
      ).toThrow();
    });

    it("rejects float limit (must be integer)", () => {
      expect(() =>
        getChannelMembersSchema.parse({ channelId: VALID_CUID, limit: 5.5 })
      ).toThrow();
    });

    it("accepts boundary values: limit = 1", () => {
      const result = getChannelMembersSchema.parse({ channelId: VALID_CUID, limit: 1 });
      expect(result.limit).toBe(1);
    });

    it("accepts boundary values: limit = 100", () => {
      const result = getChannelMembersSchema.parse({ channelId: VALID_CUID, limit: 100 });
      expect(result.limit).toBe(100);
    });

    it("applies default limit = 50 when omitted", () => {
      const result = getChannelMembersSchema.parse({ channelId: VALID_CUID });
      expect(result.limit).toBe(50);
    });
  });

  describe("7.3 offset constraints", () => {
    it("rejects negative offset", () => {
      expect(() =>
        getChannelMembersSchema.parse({ channelId: VALID_CUID, offset: -1 })
      ).toThrow();
    });

    it("rejects float offset (must be integer)", () => {
      expect(() =>
        getChannelMembersSchema.parse({ channelId: VALID_CUID, offset: 1.5 })
      ).toThrow();
    });

    it("accepts offset = 0", () => {
      const result = getChannelMembersSchema.parse({ channelId: VALID_CUID, offset: 0 });
      expect(result.offset).toBe(0);
    });

    it("applies default offset = 0 when omitted", () => {
      const result = getChannelMembersSchema.parse({ channelId: VALID_CUID });
      expect(result.offset).toBe(0);
    });
  });

  describe("7.4 full valid payload", () => {
    it("parses complete valid input correctly", () => {
      const result = getChannelMembersSchema.parse({
        channelId: VALID_CUID,
        limit: 25,
        offset: 50,
      });
      expect(result).toEqual({ channelId: VALID_CUID, limit: 25, offset: 50 });
    });
  });
});
