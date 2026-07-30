import { describe, expect, it } from "vitest";

import { validateItemInput } from "./item-input";

describe("validateItemInput", () => {
  it.each([
    ["  牛奶  ", "牛奶"],
    ["a", "a"],
    ["a".repeat(100), "a".repeat(100)]
  ])("trims and accepts an item name from 1 to 100 characters", (name, expectedName) => {
    expect(
      validateItemInput({
        name,
        locationId: "  fridge-door  "
      })
    ).toEqual({
      ok: true,
      data: {
        name: expectedName,
        locationId: "fridge-door",
        expiryDate: null
      }
    });
  });

  it.each([
    [null, "ITEM_NAME_INVALID"],
    [" \t\n ", "ITEM_NAME_REQUIRED"],
    ["a".repeat(101), "ITEM_NAME_TOO_LONG"]
  ])("rejects an invalid item name with a stable error code", (name, code) => {
    expect(
      validateItemInput({
        name,
        locationId: "fridge-door"
      })
    ).toMatchObject({
      ok: false,
      error: { code }
    });
  });

  it.each([
    [undefined, "ITEM_LOCATION_ID_INVALID"],
    [null, "ITEM_LOCATION_ID_INVALID"],
    [" \t\n ", "ITEM_LOCATION_ID_REQUIRED"]
  ])("rejects a missing or blank location id with a stable error code", (locationId, code) => {
    expect(
      validateItemInput({
        name: "Milk",
        locationId
      })
    ).toMatchObject({
      ok: false,
      error: { code }
    });
  });

  it("accepts a real direct expiry date and snapshots the normalized input", () => {
    expect(
      validateItemInput({
        name: "  Milk  ",
        locationId: "  fridge-door  ",
        expiryDate: "2028-02-29"
      })
    ).toEqual({
      ok: true,
      data: {
        name: "Milk",
        locationId: "fridge-door",
        expiryDate: "2028-02-29"
      }
    });
  });

  it.each(["2027-02-29", "2026-02-30", "2026-2-03", "2026-02-03T00:00:00Z", ""]) (
    "rejects a supplied date that is not a real YYYY-MM-DD calendar date: %s",
    (expiryDate) => {
      expect(
        validateItemInput({
          name: "Milk",
          locationId: "fridge-door",
          expiryDate
        })
      ).toMatchObject({
        ok: false,
        error: { code: "ITEM_EXPIRY_DATE_INVALID" }
      });
    }
  );

  it.each([undefined, null])("accepts an omitted direct expiry date: %s", (expiryDate) => {
    expect(
      validateItemInput({
        name: "Milk",
        locationId: "fridge-door",
        expiryDate
      })
    ).toEqual({
      ok: true,
      data: {
        name: "Milk",
        locationId: "fridge-door",
        expiryDate: null
      }
    });
  });

  it("returns a typed input error instead of throwing for an unknown object shape", () => {
    const input = {
      get name(): string {
        throw new Error("untrusted getter");
      }
    };

    expect(() => validateItemInput(input)).not.toThrow();
    expect(validateItemInput(input)).toMatchObject({
      ok: false,
      error: { code: "ITEM_INPUT_INVALID" }
    });
  });
});
