import { describe, it, expect } from "vitest";
import { backupFileSchema } from "@shared/aac";

const validCard = {
  id: "a1",
  parentId: null,
  type: "speak",
  label: "Hi",
  order: 1000,
  image: null,
  audio: null,
};

describe("backupFileSchema", () => {
  it("accepts a well-formed backup", () => {
    const res = backupFileSchema.safeParse({
      version: 1,
      exportedAt: new Date().toISOString(),
      cards: [validCard, { ...validCard, id: "a2", type: "folder" }],
    });
    expect(res.success).toBe(true);
  });

  it("rejects a wrong version", () => {
    const res = backupFileSchema.safeParse({ version: 2, exportedAt: "x", cards: [] });
    expect(res.success).toBe(false);
  });

  it("rejects a bad card type", () => {
    const res = backupFileSchema.safeParse({
      version: 1,
      exportedAt: "x",
      cards: [{ ...validCard, type: "video" }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects a non-numeric order", () => {
    const res = backupFileSchema.safeParse({
      version: 1,
      exportedAt: "x",
      cards: [{ ...validCard, order: "first" }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects when cards is not an array", () => {
    const res = backupFileSchema.safeParse({ version: 1, exportedAt: "x", cards: {} });
    expect(res.success).toBe(false);
  });
});
