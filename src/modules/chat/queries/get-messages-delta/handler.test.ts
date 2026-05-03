import { describe, it, expect, mock, beforeEach } from "bun:test";
import { handler } from "./handler";
import { AppError } from "@/shared/errors";
import type { ServiceContext } from "@/graphql/types";
import { getMessagesDeltaSchema } from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

mock.module("./steps/fetch-delta", () => ({
  fetchDelta: mock(),
}));

import { fetchDelta } from "./steps/fetch-delta";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID   = "clh1234567890abcdefghijk0";
const USER_ID      = "clh0000000000abcdefghijk1";
const WORKSPACE_ID = "clh9999999999abcdefghijk2";
const PROJECT_ID   = "clh1111111111abcdefghijk3";

const mockChannel = { id: CHANNEL_ID, workspaceId: WORKSPACE_ID, projectId: PROJECT_ID };

const mockMessage1 = { id: "msg_1", sequence: 2, content: "Hello" };
const mockMessage2 = { id: "msg_2", sequence: 3, content: "World" };
const mockMessage3 = { id: "msg_3", sequence: 4, content: "Testing delta" };

const mockDeltaList = [mockMessage1, mockMessage2, mockMessage3];

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

const buildCtx = (overrides: Partial<ServiceContext> = {}): ServiceContext => ({
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

const validInput = { conversationId: CHANNEL_ID, afterSequence: 1, limit: 2 };

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getMessagesDelta", () => {
  beforeEach(() => {
    mock.restore();
    (fetchDelta as any).mockResolvedValue(mockDeltaList);
  });

  // ── Section 1: Auth Gate ──────────────────────────────────────────────────

  describe("1. Auth Gate", () => {
    it("1.1 throws 401 BEFORE executing bounds when user is unauthenticated", async () => {
      const ctx = buildCtx({ auth: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401, code: "UNAUTHORIZED" });
      expect(fetchDelta).not.toHaveBeenCalled();
    });

    it("1.2 throws 401 when authGate is missing from context", async () => {
      const ctx = buildCtx({ authGate: null as any });
      await expect(handler(validInput, ctx)).rejects.toMatchObject({ httpStatus: 401, code: "UNAUTHORIZED" });
    });

    it("1.3 throws 404 when conversation does not exist", async () => {
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

  // ── Section 2: Success Path & Response Structuring ───────────────────────

  describe("2. Success Path & Response Composition", () => {
    it("2.1 handles standard delta mapping slicing limit perfectly", async () => {
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      // Limit is 2, but fetchDelta returns 3 => hasMore should be true, and slicing returns first 2 elements.
      expect(result).toEqual({
        messages: [mockMessage1, mockMessage2] as any[],
        hasMore: true,
        lastSequence: mockMessage2.sequence,
      });
    });

    it("2.2 computes delta properly when no messages are returned", async () => {
      (fetchDelta as any).mockResolvedValueOnce([]);
      const ctx = buildCtx();
      const result = await handler(validInput, ctx);
      expect(result).toEqual({
        messages: [],
        hasMore: false,
        lastSequence: validInput.afterSequence,
      });
    });

    it("2.3 passes explicit bounds correctly to fetchDelta", async () => {
      const ctx = buildCtx();
      await handler(validInput, ctx);
      expect(fetchDelta).toHaveBeenCalledWith(validInput, ctx);
    });
  });

  // ── Section 3: Caching ────────────────────────────────────────────────────

  describe("3. Caching", () => {
    it("3.1 executes getChannel hit to Redis caching interface", async () => {
      const getChannel = mock(async () => mockChannel);
      const ctx = buildCtx({ authGate: { getChannel, assertChannelMember: mock(async () => {}) } as any });
      await handler(validInput, ctx);
      expect(getChannel).toHaveBeenCalledTimes(1);
      expect(getChannel).toHaveBeenCalledWith(CHANNEL_ID);
    });
  });

  // ── Section 4: Error Propagation ──────────────────────────────────────────

  describe("4. Error Propagation", () => {
    it("4.1 propagates standard unhandled resolution errors natively", async () => {
      (fetchDelta as any).mockRejectedValueOnce(new Error("Database offline"));
      const ctx = buildCtx();
      try {
        await handler(validInput, ctx);
        throw new Error("Should have thrown");
      } catch (err: any) {
        expect(err).not.toBeInstanceOf(AppError);
        expect(err.message).toBe("Database offline");
      }
    });
  });

  // ── Section 5: Input Validation ───────────────────────────────────────────

  describe("5. Input Validation", () => {
    it("rejects invalid conversationId", () => {
      expect(() => getMessagesDeltaSchema.parse({ conversationId: "not-a-cuid" })).toThrow();
    });

    it("enforces explicit constraints on limits", () => {
      expect(() => getMessagesDeltaSchema.parse({ conversationId: CHANNEL_ID, limit: 250 })).toThrow();
    });

    it("populates defaults successfully when optional bounds missing", () => {
      const parsed = getMessagesDeltaSchema.parse({ conversationId: CHANNEL_ID });
      expect(parsed.limit).toBe(50);
      expect(parsed.afterSequence).toBeUndefined();
    });
  });
});
