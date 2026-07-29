import { describe, expect, it } from "vitest";

import {
  getExpiryDisplayState,
  resolveExpiryDate,
  type ShelfLife
} from "./expiry";

describe("resolveExpiryDate", () => {
  it.each([null, undefined])("returns unknown for nullish runtime input: %s", (input) => {
    expect(resolveExpiryDate(input)).toEqual({
      expiryDate: null,
      source: "UNKNOWN"
    });
  });

  it("returns unknown when a runtime input accessor throws", () => {
    const input = Object.defineProperty({}, "confirmedExpiryDate", {
      get() {
        throw new Error("untrusted accessor");
      }
    });

    expect(resolveExpiryDate(input)).toEqual({
      expiryDate: null,
      source: "UNKNOWN"
    });
  });

  it("returns unknown when a runtime input proxy throws while reading a property", () => {
    const input = new Proxy(
      {},
      {
        get() {
          throw new Error("untrusted proxy");
        }
      }
    );

    expect(resolveExpiryDate(input)).toEqual({
      expiryDate: null,
      source: "UNKNOWN"
    });
  });

  it("uses the user-confirmed expiry date ahead of every other source", () => {
    expect(
      resolveExpiryDate({
        confirmedExpiryDate: "2026-08-15",
        recognizedExpiryDate: "2026-08-10",
        productionDate: "2026-01-01",
        shelfLife: { value: 12, unit: "MONTH" }
      })
    ).toEqual({ expiryDate: "2026-08-15", source: "USER_CONFIRMED" });
  });

  it("uses the directly recognized expiry date when the user has not confirmed one", () => {
    expect(
      resolveExpiryDate({
        recognizedExpiryDate: "2026-08-10",
        productionDate: "2026-01-01",
        shelfLife: { value: 12, unit: "MONTH" }
      })
    ).toEqual({ expiryDate: "2026-08-10", source: "RECOGNIZED" });
  });

  it("ignores a timestamp confirmed date and falls through to the recognized date", () => {
    expect(
      resolveExpiryDate({
        confirmedExpiryDate: "2026-08-15T00:00:00Z",
        recognizedExpiryDate: "2026-08-10"
      })
    ).toEqual({ expiryDate: "2026-08-10", source: "RECOGNIZED" });
  });

  it("ignores an impossible recognized date and falls through to calculation", () => {
    expect(
      resolveExpiryDate({
        recognizedExpiryDate: "2026-02-30",
        productionDate: "2026-01-01",
        shelfLife: { value: 30, unit: "DAY" }
      })
    ).toEqual({ expiryDate: "2026-01-31", source: "CALCULATED" });
  });

  it("calculates an expiry date from the production date and day shelf life", () => {
    expect(
      resolveExpiryDate({
        productionDate: "2026-01-01",
        shelfLife: { value: 30, unit: "DAY" }
      })
    ).toEqual({ expiryDate: "2026-01-31", source: "CALCULATED" });
  });

  it("clips month-end dates when calculating a month shelf life", () => {
    expect(
      resolveExpiryDate({
        productionDate: "2026-01-31",
        shelfLife: { value: 1, unit: "MONTH" }
      })
    ).toEqual({ expiryDate: "2026-02-28", source: "CALCULATED" });
  });

  it("clips leap-day dates when calculating a year shelf life", () => {
    expect(
      resolveExpiryDate({
        productionDate: "2024-02-29",
        shelfLife: { value: 1, unit: "YEAR" }
      })
    ).toEqual({ expiryDate: "2025-02-28", source: "CALCULATED" });
  });

  it("returns unknown instead of calculating from a timestamp production date", () => {
    expect(() =>
      resolveExpiryDate({
        productionDate: "2026-01-01T00:00:00Z",
        shelfLife: { value: 30, unit: "DAY" }
      })
    ).not.toThrow();

    expect(
      resolveExpiryDate({
        productionDate: "2026-01-01T00:00:00Z",
        shelfLife: { value: 30, unit: "DAY" }
      })
    ).toEqual({ expiryDate: null, source: "UNKNOWN" });
  });

  it("returns unknown instead of calculating from an impossible production date", () => {
    expect(
      resolveExpiryDate({
        productionDate: "2026-02-30",
        shelfLife: { value: 1, unit: "DAY" }
      })
    ).toEqual({ expiryDate: null, source: "UNKNOWN" });
  });

  it.each([
    ["a zero value", { value: 0, unit: "DAY" }],
    ["a fractional value", { value: 1.5, unit: "DAY" }],
    ["a non-finite value", { value: Number.POSITIVE_INFINITY, unit: "DAY" }],
    ["an unsupported unit", { value: 1, unit: "WEEK" }]
  ] as const)("returns unknown for shelf life with %s", (_label, invalidShelfLife) => {
    const shelfLife = invalidShelfLife as unknown as ShelfLife;
    const input = { productionDate: "2026-01-01", shelfLife };

    expect(() => resolveExpiryDate(input)).not.toThrow();
    expect(resolveExpiryDate(input)).toEqual({ expiryDate: null, source: "UNKNOWN" });
  });

  it("returns unknown rather than throwing when a valid shelf life overflows the calendar", () => {
    const input = {
      productionDate: "2026-01-01",
      shelfLife: { value: Number.MAX_SAFE_INTEGER, unit: "DAY" as const }
    };

    expect(() => resolveExpiryDate(input)).not.toThrow();
    expect(resolveExpiryDate(input)).toEqual({ expiryDate: null, source: "UNKNOWN" });
  });

  it("returns an unknown expiry when no recognized or calculable date exists", () => {
    expect(resolveExpiryDate({})).toEqual({ expiryDate: null, source: "UNKNOWN" });
  });

  it("ignores an invalid confirmed date and falls back to a valid recognized date", () => {
    expect(
      resolveExpiryDate({
        confirmedExpiryDate: "2026-02-30",
        recognizedExpiryDate: "2026-08-10"
      })
    ).toEqual({ expiryDate: "2026-08-10", source: "RECOGNIZED" });
  });

  it("does not roll an invalid production date into a different calendar date", () => {
    expect(
      resolveExpiryDate({
        productionDate: "2026-02-30",
        shelfLife: { value: 1, unit: "DAY" }
      })
    ).toEqual({ expiryDate: null, source: "UNKNOWN" });
  });

  it("requires a positive integer shelf-life value before calculating an expiry", () => {
    expect(
      resolveExpiryDate({
        productionDate: "2026-01-01",
        shelfLife: { value: 0, unit: "DAY" }
      })
    ).toEqual({ expiryDate: null, source: "UNKNOWN" });
  });
});

describe("getExpiryDisplayState", () => {
  it.each([null, undefined])("shows unknown for nullish runtime input: %s", (input) => {
    expect(getExpiryDisplayState(input)).toBe("UNKNOWN");
  });

  it("shows unknown when a runtime input accessor throws", () => {
    const input = Object.defineProperty({}, "itemStatus", {
      get() {
        throw new Error("untrusted accessor");
      }
    });

    expect(getExpiryDisplayState(input)).toBe("UNKNOWN");
  });

  it("shows unknown when a runtime input proxy throws while reading a property", () => {
    const input = new Proxy(
      {},
      {
        get() {
          throw new Error("untrusted proxy");
        }
      }
    );

    expect(getExpiryDisplayState(input)).toBe("UNKNOWN");
  });

  it("shows used and discarded item states ahead of date-derived states", () => {
    expect(
      getExpiryDisplayState({
        itemStatus: "USED",
        expiryDate: "2026-08-01T00:00:00Z",
        reminderDays: Number.NaN,
        today: "not-a-date"
      })
    ).toBe("USED");

    expect(
      getExpiryDisplayState({
        itemStatus: "DISCARDED",
        expiryDate: "2026-08-01T00:00:00Z",
        reminderDays: Number.NaN,
        today: "not-a-date"
      })
    ).toBe("DISCARDED");
  });

  it("shows unknown for an active item without an expiry date", () => {
    expect(
      getExpiryDisplayState({
        itemStatus: "ACTIVE",
        expiryDate: null,
        reminderDays: 3,
        today: "2026-08-01"
      })
    ).toBe("UNKNOWN");
  });

  it("fails closed for an unknown item status received at runtime", () => {
    expect(
      getExpiryDisplayState({
        itemStatus: "ARCHIVED" as never,
        expiryDate: "2026-08-10",
        reminderDays: 3,
        today: "2026-08-10"
      })
    ).toBe("UNKNOWN");
  });

  it("shows normal before the reminder window", () => {
    expect(
      getExpiryDisplayState({
        itemStatus: "ACTIVE",
        expiryDate: "2026-08-10",
        reminderDays: 3,
        today: "2026-08-06"
      })
    ).toBe("NORMAL");
  });

  it("shows expiring soon from the reminder date through the expiry date", () => {
    expect(
      getExpiryDisplayState({
        itemStatus: "ACTIVE",
        expiryDate: "2026-08-10",
        reminderDays: 3,
        today: "2026-08-07"
      })
    ).toBe("EXPIRING_SOON");

    expect(
      getExpiryDisplayState({
        itemStatus: "ACTIVE",
        expiryDate: "2026-08-10",
        reminderDays: 3,
        today: "2026-08-10"
      })
    ).toBe("EXPIRING_SOON");
  });

  it("shows expired after the expiry date", () => {
    expect(
      getExpiryDisplayState({
        itemStatus: "ACTIVE",
        expiryDate: "2026-08-10",
        reminderDays: 3,
        today: "2026-08-11"
      })
    ).toBe("EXPIRED");
  });

  it.each([
    ["a timestamp expiry date", "2026-08-10T00:00:00Z", "2026-08-06"],
    ["an impossible expiry date", "2026-02-30", "2026-02-01"],
    ["a timestamp today date", "2026-08-10", "2026-08-06T00:00:00Z"]
  ])("shows unknown for an active item with %s", (_label, expiryDate, today) => {
    expect(
      getExpiryDisplayState({
        itemStatus: "ACTIVE",
        expiryDate,
        reminderDays: 3,
        today
      })
    ).toBe("UNKNOWN");
  });

  it.each([-1, 1.5, Number.POSITIVE_INFINITY])(
    "shows unknown for an active item with invalid reminder days: %s",
    (reminderDays) => {
      const input = {
        itemStatus: "ACTIVE" as const,
        expiryDate: "2026-08-10",
        reminderDays,
        today: "2026-08-10"
      };

      expect(() => getExpiryDisplayState(input)).not.toThrow();
      expect(getExpiryDisplayState(input)).toBe("UNKNOWN");
    }
  );

  it("shows unknown when a valid integer reminder window cannot be represented as a calendar date", () => {
    expect(
      getExpiryDisplayState({
        itemStatus: "ACTIVE",
        expiryDate: "2026-08-10",
        reminderDays: 1_000_000_000,
        today: "2026-08-06"
      })
    ).toBe("UNKNOWN");
  });
});
