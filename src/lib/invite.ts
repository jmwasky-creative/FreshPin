import { createHash, randomBytes } from "node:crypto";
import { formatInviteCode, normalizeInviteCode } from "@/lib/invite-code";

export function hashInviteCode(value: string): string {
  return createHash("sha256").update(normalizeInviteCode(value)).digest("hex");
}

export function createInviteCode(): { code: string; codeHash: string } {
  const compactCode = `FP${randomBytes(16).toString("hex").toUpperCase()}`;
  return {
    code: formatInviteCode(compactCode),
    codeHash: hashInviteCode(compactCode),
  };
}
