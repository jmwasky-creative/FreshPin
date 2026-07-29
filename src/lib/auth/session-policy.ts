export const SESSION_MAX_AGE_DAYS = 30;
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export type SessionValidity = "VALID" | "EXPIRED" | "INVALID";

const ISO_UTC_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function parseIsoUtcTimestamp(value: string): Date | null {
  if (!ISO_UTC_TIMESTAMP.test(value)) {
    return null;
  }

  const timestamp = new Date(value);

  if (!Number.isFinite(timestamp.getTime())) {
    return null;
  }

  const canonicalTimestamp = timestamp.toISOString();
  const timestampWithoutMilliseconds = canonicalTimestamp.replace(".000Z", "Z");

  return value === canonicalTimestamp || value === timestampWithoutMilliseconds
    ? timestamp
    : null;
}

export function getSessionValidity(
  issuedAt: string,
  now: string
): SessionValidity {
  const issuedAtTimestamp = parseIsoUtcTimestamp(issuedAt);
  const currentTimestamp = parseIsoUtcTimestamp(now);

  if (!issuedAtTimestamp || !currentTimestamp) {
    return "INVALID";
  }

  const sessionAgeMs = currentTimestamp.getTime() - issuedAtTimestamp.getTime();

  if (sessionAgeMs < 0) {
    return "INVALID";
  }

  return sessionAgeMs <= SESSION_MAX_AGE_MS ? "VALID" : "EXPIRED";
}

export function isSessionWithinPolicy(issuedAt: string, now: string): boolean {
  return getSessionValidity(issuedAt, now) === "VALID";
}
