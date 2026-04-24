import { describe, it, expect } from "vitest";
import { CreateWorkspaceSchema } from "../schema";

describe("CreateWorkspaceSchema — slug length boundaries", () => {
  it("accepts exactly MIN_SLUG_LENGTH (3) characters", () => {
    const result = CreateWorkspaceSchema.safeParse({
      slug: "abc",
      name: "My Workspace",
      userId: "user123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts exactly MAX_SLUG_LENGTH (64) characters", () => {
    const slug = "a".repeat(64);
    const result = CreateWorkspaceSchema.safeParse({
      slug,
      name: "My Workspace",
      userId: "user123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects slug shorter than MIN_SLUG_LENGTH", () => {
    const result = CreateWorkspaceSchema.safeParse({
      slug: "ab", // 2 chars — too short
      name: "My Workspace",
      userId: "user123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 3");
    }
  });

  it("rejects slug longer than MAX_SLUG_LENGTH", () => {
    const slug = "a".repeat(65); // 65 chars — too long
    const result = CreateWorkspaceSchema.safeParse({
      slug,
      name: "My Workspace",
      userId: "user123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at most 64");
    }
  });

  it("rejects purely numeric slug", () => {
    const result = CreateWorkspaceSchema.safeParse({
      slug: "12345678",
      name: "My Workspace",
      userId: "user123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects reserved slug", () => {
    const result = CreateWorkspaceSchema.safeParse({
      slug: "admin",
      name: "My Workspace",
      userId: "user123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("reserved");
    }
  });
});

