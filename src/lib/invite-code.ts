const INVITE_CODE_PATTERN = /^FP[A-F0-9]{32}$/;

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidInviteCode(value: string): boolean {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(value));
}

export function formatInviteCode(value: string): string {
  const normalized = normalizeInviteCode(value);
  if (!INVITE_CODE_PATTERN.test(normalized)) return value.trim().toUpperCase();

  const groups = normalized.slice(2).match(/.{1,4}/g) ?? [];
  return `FP-${groups.join("-")}`;
}
