import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/navigation";

describe("safeRedirectPath", () => {
  it("keeps internal paths, queries, and fragments", () => {
    expect(safeRedirectPath("/spaces/123?tab=items#latest")).toBe(
      "/spaces/123?tab=items#latest",
    );
  });

  it("rejects absolute external URLs", () => {
    expect(safeRedirectPath("https://example.com/phishing")).toBe("/");
  });

  it("rejects protocol-relative and backslash-based URLs", () => {
    expect(safeRedirectPath("//example.com/phishing")).toBe("/");
    expect(safeRedirectPath("/\\example.com/phishing")).toBe("/");
  });

  it("falls back to home for missing values", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });
});
