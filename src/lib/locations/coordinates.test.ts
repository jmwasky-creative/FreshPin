import { describe, expect, it } from "vitest";

import {
  getNormalizedLocationFromClick,
  isNormalizedLocation,
  toMarkerPosition
} from "./coordinates";

describe("getNormalizedLocationFromClick", () => {
  it("normalizes a click relative to the displayed image content box", () => {
    const coordinate = getNormalizedLocationFromClick(
      { clientX: 250, clientY: 100 },
      { left: 100, top: 40, width: 400, height: 240 }
    );

    expect(coordinate).toEqual({ xRatio: 0.375, yRatio: 0.25 });
  });

  it("rejects a click outside the displayed image content box", () => {
    const coordinate = getNormalizedLocationFromClick(
      { clientX: 99, clientY: 100 },
      { left: 100, top: 40, width: 400, height: 240 }
    );

    expect(coordinate).toBeNull();
  });

  it("rejects a content box without drawable width", () => {
    const coordinate = getNormalizedLocationFromClick(
      { clientX: 100, clientY: 40 },
      { left: 100, top: 40, width: 0, height: 240 }
    );

    expect(coordinate).toBeNull();
  });

  it("rejects a content box with a negative dimension", () => {
    const coordinate = getNormalizedLocationFromClick(
      { clientX: 50, clientY: 100 },
      { left: 100, top: 40, width: -400, height: 240 }
    );

    expect(coordinate).toBeNull();
  });
});

describe("isNormalizedLocation", () => {
  it("accepts ratios at the inclusive bounds and rejects values outside them", () => {
    expect(isNormalizedLocation({ xRatio: 0, yRatio: 1 })).toBe(true);
    expect(isNormalizedLocation({ xRatio: -0.00001, yRatio: 0.5 })).toBe(
      false
    );
    expect(isNormalizedLocation({ xRatio: 0.5, yRatio: 1.00001 })).toBe(false);
  });

  it("returns false instead of propagating an accessor error from untrusted input", () => {
    const untrustedCoordinate = Object.defineProperty({}, "xRatio", {
      get() {
        throw new Error("Unexpected accessor execution");
      }
    });

    expect(isNormalizedLocation(untrustedCoordinate)).toBe(false);
  });
});

describe("toMarkerPosition", () => {
  it("preserves normalized ratios as percentage positions for marker rendering", () => {
    expect(toMarkerPosition({ xRatio: 0.625, yRatio: 0.3125 })).toEqual({
      left: "62.5%",
      top: "31.25%"
    });
  });

  it("rejects invalid runtime coordinates before rendering a marker", () => {
    expect(toMarkerPosition({ xRatio: 2, yRatio: 0.25 })).toBeNull();
  });
});
