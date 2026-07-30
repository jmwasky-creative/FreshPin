import { describe, expect, it } from "vitest";
import {
  addShelfLife,
  diffCalendarDays,
  expiryState,
  isValidTimeZone,
} from "@/lib/date";

describe("date helpers", () => {
  it("clamps end-of-month when adding months", () => {
    expect(addShelfLife("2026-01-31", 1, "MONTH")).toBe("2026-02-28");
  });

  it("handles leap years", () => {
    expect(addShelfLife("2024-02-29", 1, "YEAR")).toBe("2025-02-28");
  });

  it("calculates calendar-day difference", () => {
    expect(diffCalendarDays("2026-07-29", "2026-08-01")).toBe(3);
  });

  it("returns expiry state", () => {
    expect(expiryState("2026-08-01", 3, "2026-07-29")).toBe("SOON");
    expect(expiryState("2026-07-28", 3, "2026-07-29")).toBe("EXPIRED");
  });

  it("validates IANA time zones", () => {
    expect(isValidTimeZone("Asia/Shanghai")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Invalid/Timezone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
