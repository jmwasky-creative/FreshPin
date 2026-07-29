import { describe, expect, it } from "vitest";

import {
  getSessionValidity,
  isSessionWithinPolicy,
  SESSION_MAX_AGE_DAYS,
  SESSION_MAX_AGE_MS
} from "./session-policy";

describe("session policy", () => {
  it("defines a 30-day maximum session age", () => {
    expect(SESSION_MAX_AGE_DAYS).toBe(30);
    expect(SESSION_MAX_AGE_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("keeps a session valid at the exact 30-day boundary", () => {
    expect(
      getSessionValidity("2026-07-01T00:00:00.000Z", "2026-07-31T00:00:00.000Z")
    ).toBe("VALID");
  });

  it("expires a session one millisecond after the 30-day boundary", () => {
    expect(
      getSessionValidity("2026-07-01T00:00:00.000Z", "2026-07-31T00:00:00.001Z")
    ).toBe("EXPIRED");
  });

  it.each([
    ["a timestamp without a UTC designator", "2026-07-01T00:00:00.000", "2026-07-02T00:00:00.000Z"],
    ["an impossible issued-at date", "2026-02-30T00:00:00.000Z", "2026-03-01T00:00:00.000Z"],
    ["a malformed current timestamp", "2026-07-01T00:00:00.000Z", "not-a-timestamp"],
    ["a current timestamp before issue time", "2026-07-02T00:00:00.000Z", "2026-07-01T00:00:00.000Z"]
  ])("treats %s as invalid", (_label, issuedAt, now) => {
    expect(getSessionValidity(issuedAt, now)).toBe("INVALID");
  });

  it("provides a boolean helper only for a valid session window", () => {
    expect(
      isSessionWithinPolicy("2026-07-01T00:00:00Z", "2026-07-30T23:59:59Z")
    ).toBe(true);
    expect(
      isSessionWithinPolicy("2026-07-01T00:00:00Z", "2026-07-31T00:00:00.001Z")
    ).toBe(false);
    expect(isSessionWithinPolicy("invalid", "2026-07-01T00:00:00Z")).toBe(false);
  });
});
