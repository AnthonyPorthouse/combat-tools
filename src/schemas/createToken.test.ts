import { describe, it, expect } from "vitest";

import { createTokenSchema } from "./createToken";

describe("createTokenSchema", () => {
  it("accepts a valid full object", () => {
    const result = createTokenSchema.safeParse({
      name: "Goblin",
      size: 1,
      image: "https://example.com/goblin.png",
      locked: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal required fields only", () => {
    const result = createTokenSchema.safeParse({ name: "Goblin", size: 1 });
    expect(result.success).toBe(true);
  });

  it("fails when name is empty", () => {
    const result = createTokenSchema.safeParse({ name: "", size: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name");
    }
  });

  it("fails when name exceeds 50 characters", () => {
    const result = createTokenSchema.safeParse({ name: "a".repeat(51), size: 1 });
    expect(result.success).toBe(false);
  });

  it("accepts all valid sizes", () => {
    for (const size of [0.5, 1, 2, 3, 4]) {
      const result = createTokenSchema.safeParse({ name: "Token", size });
      expect(result.success).toBe(true);
    }
  });

  it("fails for an invalid size", () => {
    const result = createTokenSchema.safeParse({ name: "Token", size: 3.5 });
    expect(result.success).toBe(false);
  });

  it("accepts an empty string for image (treated as no image)", () => {
    const result = createTokenSchema.safeParse({ name: "Token", size: 1, image: "" });
    expect(result.success).toBe(true);
  });

  it("fails for an invalid image URL", () => {
    const result = createTokenSchema.safeParse({ name: "Token", size: 1, image: "not-a-url" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("image");
    }
  });

  it("accepts a valid image URL", () => {
    const result = createTokenSchema.safeParse({
      name: "Token",
      size: 1,
      image: "https://example.com/token.png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts locked as true or false", () => {
    expect(createTokenSchema.safeParse({ name: "T", size: 1, locked: true }).success).toBe(true);
    expect(createTokenSchema.safeParse({ name: "T", size: 1, locked: false }).success).toBe(true);
  });
});
