import { describe, it, expect } from "vitest";
import { CreateProjectSchema } from "../schema";

describe("CreateProjectSchema — slug length boundaries", () => {
  it("accepts exactly MAX_SLUG_LENGTH (64) characters", () => {
    const slug = "a".repeat(64);
    const result = CreateProjectSchema.safeParse({
      slug,
      name: "My Project",
    });
    expect(result.success).toBe(true);
  });

  it("rejects slug longer than MAX_SLUG_LENGTH", () => {
    const slug = "a".repeat(65);
    const result = CreateProjectSchema.safeParse({
      slug,
      name: "My Project",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at most 64");
    }
  });

  it("accepts valid hyphenated slug within limit", () => {
    const result = CreateProjectSchema.safeParse({
      slug: "my-awesome-project",
      name: "My Project",
    });
    expect(result.success).toBe(true);
  });

  it("accepts project creation without slug (auto-generated)", () => {
    const result = CreateProjectSchema.safeParse({
      name: "My Project",
    });
    expect(result.success).toBe(true);
  });
});
