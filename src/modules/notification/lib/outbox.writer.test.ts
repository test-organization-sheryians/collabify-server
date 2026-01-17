import { describe, it, expect, mock, beforeEach } from "bun:test";
import { OutboxWriter } from "./outbox.writer";
import { AppError } from "@/shared/errors";
import { NotificationEvent } from "../core/types";
import { Prisma } from "@prisma/client";

// -----------------------------------------------------------------------------
// MOCKS
// -----------------------------------------------------------------------------

// Mock Transaction Object
const mockTx = {
  notificationOutbox: {
    create: mock(),
  },
};

// Mock Logger
mock.module("@/shared/logger", () => ({
  logger: {
    debug: mock(),
    error: mock(),
    info: mock(),
    warn: mock(),
  },
}));

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

describe("OutboxWriter SRE & Logic Suite", () => {
  beforeEach(() => {
    mock.restore();
    (mockTx.notificationOutbox.create as any).mockClear();

    // Default Happy Path behavior
    (mockTx.notificationOutbox.create as any).mockResolvedValue({ id: 1n });
  });

  describe("1. Core Logic & Security", () => {
    it("should PERSIST a valid event to the Outbox (Happy Path)", async () => {
      const validEvent: NotificationEvent = {
        type: "workspace.invite",
        actorId: "actor_123",
        tenantId: "tenant_456",
        deduplicationId: "unique_req_id",
        payload: {
          workspaceId: "ws_1",
          workspaceName: "My Workspace",
        },
      };

      // @ts-ignore - Mocking Prisma Transaction
      await OutboxWriter.emit(mockTx, validEvent);

      expect(mockTx.notificationOutbox.create).toHaveBeenCalledTimes(1);
      expect(mockTx.notificationOutbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "workspace.invite",
            deduplicationId: "unique_req_id",
            payload: expect.objectContaining({
              workspaceId: "ws_1",
              workspaceName: "My Workspace",
              actorId: "actor_123", // Context Merging Check
              tenantId: "tenant_456", // Context Merging Check
            }),
          }),
        })
      );
    });

    it("should handle Minimal Payload (No optional context)", async () => {
      const minimalEvent: NotificationEvent = {
        type: "system.alert",
        payload: { message: "hello" },
      };

      // @ts-ignore
      await OutboxWriter.emit(mockTx, minimalEvent);

      expect(mockTx.notificationOutbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: "system.alert",
            deduplicationId: undefined, // Prisma handles undefined as NULL usually (or we skip key)
            // payload check
          }),
        })
      );
    });
  });

  describe("2. Infrastructure Chaos (System Failures)", () => {
    it("should Fail Closed (Wrap Error) when DB throws Unknown Error", async () => {
      const event: NotificationEvent = { type: "test", payload: {} };

      // Simulate DB Connection Death
      (mockTx.notificationOutbox.create as any).mockRejectedValue(
        new Error("FATAL: Connection Lost")
      );

      try {
        // @ts-ignore
        await OutboxWriter.emit(mockTx, event);
        throw new Error("Should have thrown AppError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.httpStatus).toBe(500);
        expect(err.message).toBe("FATAL: Connection Lost");
      }
    });

    it("should Propagate AppErrors if they are already typed", async () => {
      const event: NotificationEvent = { type: "test", payload: {} };

      // Simulate a pre-thrown AppError (rare from DB, but possible from middleware)
      (mockTx.notificationOutbox.create as any).mockRejectedValue(
        new AppError("Already AppError", "TEST", 500)
      );

      try {
        // @ts-ignore
        await OutboxWriter.emit(mockTx, event);
        throw new Error("Should have thrown");
      } catch (err: any) {
        expect(err.message).toBe("Already AppError");
        // Should NOT wrap it again
        expect(err.code).toBe("TEST");
      }
    });
  });

  describe("3. Concurrency & Race Conditions", () => {
    it("should propagate P2002 (Unique Constraint) as 500 Internal Error", async () => {
      // This simulates an Idempotency Key Collision
      const collisionEvent: NotificationEvent = {
        type: "test.event",
        deduplicationId: "duplicate_id",
        payload: { foo: "bar" },
      };

      // Simulate Prisma Error
      const prismaError = new Error(
        "Unique constraint failed on the fields: (`deduplication_id`)"
      );
      // @ts-ignore
      prismaError.code = "P2002";

      (mockTx.notificationOutbox.create as any).mockRejectedValue(prismaError);

      try {
        // @ts-ignore
        await OutboxWriter.emit(mockTx, collisionEvent);
        throw new Error("Should have thrown P2002 wrapper");
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.httpStatus).toBe(500);
        expect(err.message).toContain("Unique constraint");
      }
    });
  });

  describe("4. Input Fuzzing & Validation", () => {
    it("should REJECT missing event type", async () => {
      const invalidInput = { payload: {} }; // No Type
      try {
        // @ts-ignore
        await OutboxWriter.emit(mockTx, invalidInput);
        throw new Error("Should have failed validation");
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.httpStatus).toBe(400);
        expect(err.message).toContain("Payload missing");
      }
    });

    it("should REJECT missing payload object", async () => {
      const invalidInput = { type: "test" }; // No Payload
      try {
        // @ts-ignore
        await OutboxWriter.emit(mockTx, invalidInput);
        throw new Error("Should have failed validation");
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.httpStatus).toBe(400);
      }
    });
  });
});
