import { describe, expect, it } from "vitest";
import { createInviteCode, hashInviteCode } from "@/lib/invite";
import { normalizeInviteCode } from "@/lib/invite-code";

describe("server invite helpers", () => {
  it("creates a valid code and its SHA-256 hash", () => {
    const invite = createInviteCode();
    expect(normalizeInviteCode(invite.code)).toMatch(/^FP[A-F0-9]{32}$/);
    expect(invite.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteCode(invite.code)).toBe(invite.codeHash);
  });
});
