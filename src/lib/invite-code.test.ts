import { describe, expect, it } from "vitest";
import { formatInviteCode, isValidInviteCode, normalizeInviteCode } from "@/lib/invite-code";

describe("invite code helpers", () => {
  const compact = "FP0123456789ABCDEF0123456789ABCDEF";

  it("normalizes whitespace, punctuation, and casing", () => {
    expect(normalizeInviteCode(" fp-0123 4567-89ab-cdef-0123-4567-89ab-cdef ")).toBe(compact);
  });

  it("formats valid codes without changing their entropy", () => {
    expect(formatInviteCode(compact)).toBe("FP-0123-4567-89AB-CDEF-0123-4567-89AB-CDEF");
  });

  it("rejects malformed codes", () => {
    expect(isValidInviteCode(compact)).toBe(true);
    expect(isValidInviteCode("FP-TOO-SHORT")).toBe(false);
    expect(isValidInviteCode("not-an-invite-code")).toBe(false);
  });
});
