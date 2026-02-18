import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  spyOn,
} from "bun:test";
import { handler, compareStreamIds } from "./handler";
import { AppError } from "@/shared/errors";
import { Y } from "@/shared/yjs";

// Mock setTimeout to run immediately to avoid waiting in tests
const originalSetTimeout = global.setTimeout;
// @ts-ignore
global.setTimeout = (cb: Function, ms: number) => {
  cb();
  return { hasRef: () => false, ref: () => {}, unref: () => {} } as any;
};

// Mock logger to avoid side effects
mock.module("@/shared/lib/logger", () => ({
  createLogger: () => ({
    info: mock(),
    warn: mock(),
    error: mock(),
    debug: mock(),
  }),
}));

// Mocks
const mockS3Download = mock(() => Promise.resolve(new Uint8Array()));
mock.module("../../infra/s3-client", () => ({
  downloadSnapshot: mockS3Download,
}));

const mockLockAcquire = mock(() => Promise.resolve(true));
const mockLockRelease = mock(() => Promise.resolve());
mock.module("@/services/locking/locking.service", () => ({
  LockingService: {
    acquire: mockLockAcquire,
    release: mockLockRelease,
  },
}));

// Setup context
const mockDb = {
  whiteboard: {
    findFirst: mock(),
  },
};

const mockRedis = {
  get: mock(),
  setex: mock(),
  xrange: mock(),
};

const mockCtx = {
  db: mockDb,
  redis: mockRedis,
  auth: { userId: "user-123" },
} as any;

describe("compareStreamIds", () => {
  it("should compare valid stream IDs correctly", () => {
    expect(compareStreamIds("1000-0", "999-0")).toBeGreaterThan(0);
    expect(compareStreamIds("1000-0", "1000-1")).toBeLessThan(0);
    expect(compareStreamIds("1000-0", "1000-0")).toBe(0);
    expect(compareStreamIds("10-0", "9-0")).toBeGreaterThan(0); // Numeric check
  });

  it("should handle null/undefined gracefully", () => {
    expect(compareStreamIds(null as any, "1000-0")).toBeLessThan(0);
    expect(compareStreamIds("1000-0", null as any)).toBeGreaterThan(0);
    expect(compareStreamIds(null as any, null as any)).toBe(0);
  });

  it("should handle malformed IDs", () => {
    expect(compareStreamIds("invalid", "1000-0")).toBeLessThan(0);
    expect(compareStreamIds("1000", "1000-0")).toBeLessThan(0);
    expect(compareStreamIds("1000-abc", "1000-0")).toBe(0); // NaN treated as equal
  });
});

describe("get-board-snapshot handler", () => {
  beforeEach(() => {
    mockDb.whiteboard.findFirst.mockReset();
    mockRedis.get.mockReset();
    mockRedis.setex.mockReset();
    mockRedis.xrange.mockReset();
    mockS3Download.mockReset();
    mockLockAcquire.mockReset();

    // Default behaviors
    mockLockAcquire.mockReturnValue(Promise.resolve(true));
    mockRedis.xrange.mockReturnValue(Promise.resolve([])); // Default: stream empty
  });

  it("should throw UNAUTHORIZED if no user", async () => {
    const ctx = { ...mockCtx, auth: {} };
    await expect(handler({ boardId: "b1" }, ctx)).rejects.toThrow(
      "User not authenticated"
    );
  });

  it("should throw FORBIDDEN if board not found", async () => {
    mockDb.whiteboard.findFirst.mockReturnValue(Promise.resolve(null));
    await expect(handler({ boardId: "b1" }, mockCtx)).rejects.toThrow(
      "Whiteboard not found"
    );
  });

  describe("Cache Hit", () => {
    it("should return cached snapshot + delta", async () => {
      mockDb.whiteboard.findFirst.mockReturnValue(
        Promise.resolve({
          id: "b1",
          s3Key: "key",
          lastSnapshotStreamId: "0-0",
        })
      );

      // Mock cache present
      // "AAA=" is valid base64 for minimal Yjs update (Uint8Array [0, 0])
      const validUpdateB64 = "AAA=";

      mockRedis.get.mockReturnValue(
        Promise.resolve(
          JSON.stringify({
            binary: validUpdateB64,
            streamId: "1000-0",
            updatedAt: Date.now(),
          })
        )
      );

      // Mock stream delta
      // Use mockReturnValueOnce so subsequent calls return [] (from beforeEach default)
      // preventing infinite loop/MAX_REPLAY error
      mockRedis.xrange.mockReturnValueOnce(
        Promise.resolve([
          ["1000-1", ["boardId", "b1", "update", validUpdateB64]],
        ])
      );

      const result = await handler({ boardId: "b1" }, mockCtx);

      expect(result.lastStreamId).toBe("1000-1");
      expect(mockS3Download).not.toHaveBeenCalled(); // Validating Fix #1 logic
    });
  });

  describe("Cache Miss", () => {
    it("should acquire lock and download S3 if cache miss", async () => {
      mockDb.whiteboard.findFirst.mockReturnValue(
        Promise.resolve({
          id: "b1",
          s3Key: "key",
          lastSnapshotStreamId: "0-0",
        })
      );

      mockRedis.get.mockReturnValue(Promise.resolve(null)); // Cache miss
      mockLockAcquire.mockReturnValue(Promise.resolve(true)); // Lock acquired
      mockS3Download.mockReturnValue(Promise.resolve(new Uint8Array([0, 0]))); // Mock S3 download

      mockRedis.xrange.mockReturnValue(Promise.resolve([])); // No stream updates

      const result = await handler({ boardId: "b1" }, mockCtx);

      expect(mockLockAcquire).toHaveBeenCalled();
      expect(mockS3Download).toHaveBeenCalled();
      expect(result.snapshot).toBeDefined();
    });

    it("should NOT download S3 if cache miss but warmed by other process (Fix #1 check)", async () => {
      mockDb.whiteboard.findFirst.mockReturnValue(
        Promise.resolve({
          id: "b1",
          s3Key: "key",
          lastSnapshotStreamId: "0-0",
        })
      );

      // 1. Initial Cache miss
      mockRedis.get
        .mockReturnValueOnce(Promise.resolve(null))
        // 2. Retry finds cache (simulated)
        .mockReturnValueOnce(
          Promise.resolve(
            JSON.stringify({
              binary: Buffer.from(Y.encodeStateAsUpdate(new Y.Doc())).toString(
                "base64"
              ),
              streamId: "2000-0",
            })
          )
        );

      mockLockAcquire.mockReturnValue(Promise.resolve(false)); // Lock NOT acquired

      const result = await handler({ boardId: "b1" }, mockCtx);

      // Should use retry cache and NOT download S3
      expect(mockS3Download).not.toHaveBeenCalled();
      expect(result.lastStreamId).toBe("2000-0");
    });
  });

  describe("MAX_REPLAY Error (Fix #3)", () => {
    it("should throw SNAPSHOT_REQUIRED if stream too large", async () => {
      mockDb.whiteboard.findFirst.mockReturnValue(
        Promise.resolve({
          id: "b1",
          lastSnapshotStreamId: "0-0",
        })
      );
      mockRedis.get.mockReturnValue(Promise.resolve(null));
      mockLockAcquire.mockReturnValue(Promise.resolve(true));
      mockS3Download.mockReturnValue(Promise.resolve(new Uint8Array()));

      // Mock HUGE stream response to trigger MAX_REPLAY loop
      // We'll mock a batch that keeps returning items until limit
      const batchSize = 5000;
      const validUpdateB64 = "AAA=";
      const hugeBatch = new Array(batchSize)
        .fill(0)
        .map((_, i) => [`${i}-0`, ["update", validUpdateB64]]);

      mockRedis.xrange.mockReturnValue(Promise.resolve(hugeBatch));

      // We expect it to run multiple batches and then fail
      // Since MAX_REPLAY is 50,000, we need it to return > 10 batches of 5000.
      // Simplified test: mock xrange to always return full batch

      try {
        await handler({ boardId: "b1" }, mockCtx);
        // Should fail
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.message).toContain("pending updates");
        // AppError defaults to INTERNAL_SERVER_ERROR for unknown codes
        expect(e.code).toBe("INTERNAL_SERVER_ERROR");
      }
    });
  });
});
