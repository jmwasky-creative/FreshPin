import { describe, expect, it } from "vitest";

import { validateSpaceInput } from "./space-input";

describe("validateSpaceInput", () => {
  it("returns a typed validation error when a space input getter throws", () => {
    const input = {
      get name(): string {
        throw new Error("untrusted getter");
      },
      image: {
        mimeType: "image/jpeg",
        sizeBytes: 1
      }
    };

    expect(() => validateSpaceInput(input)).not.toThrow();
    expect(validateSpaceInput(input)).toEqual({
      ok: false,
      error: {
        code: "SPACE_INPUT_INVALID",
        message: "Space input must be an object."
      }
    });
  });

  it("returns a typed validation error instead of throwing for a non-object input", () => {
    expect(() => validateSpaceInput(null as never)).not.toThrow();

    expect(validateSpaceInput(null as never)).toEqual({
      ok: false,
      error: {
        code: "SPACE_INPUT_INVALID",
        message: "Space input must be an object."
      }
    });
  });

  it("returns a typed validation error for a non-text space name", () => {
    expect(
      validateSpaceInput({
        name: null,
        image: {
          mimeType: "image/jpeg",
          sizeBytes: 1
        }
      })
    ).toEqual({
      ok: false,
      error: {
        code: "SPACE_NAME_INVALID",
        message: "A space name must be text."
      }
    });
  });

  it("returns a typed validation error for a malformed space image", () => {
    expect(
      validateSpaceInput({
        name: "Kitchen",
        image: null
      })
    ).toEqual({
      ok: false,
      error: {
        code: "SPACE_IMAGE_INVALID",
        message: "A space image must be an object."
      }
    });
  });

  it("returns a typed validation error for a non-text image MIME type", () => {
    expect(
      validateSpaceInput({
        name: "Kitchen",
        image: {
          mimeType: null,
          sizeBytes: 1
        }
      })
    ).toEqual({
      ok: false,
      error: {
        code: "SPACE_IMAGE_INVALID",
        message: "A space image must include a MIME type."
      }
    });
  });

  it.each([undefined, null, "1", Number.NaN, Infinity, -Infinity, -1, 1.5])(
    "returns a typed validation error for invalid image size metadata: %s",
    (sizeBytes) => {
      expect(
        validateSpaceInput({
          name: "Kitchen",
          image: {
            mimeType: "image/jpeg",
            sizeBytes
          }
        })
      ).toEqual({
        ok: false,
        error: {
          code: "SPACE_IMAGE_SIZE_INVALID",
          message: "A space image size must be a non-negative whole number of bytes."
        }
      });
    }
  );

  it("returns a trimmed space name for a valid space input", () => {
    const result = validateSpaceInput({
      name: "  Kitchen  ",
      image: {
        mimeType: "image/jpeg",
        sizeBytes: 1
      }
    });

    expect(result).toEqual({
      ok: true,
      data: {
        name: "Kitchen",
        image: {
          mimeType: "image/jpeg",
          sizeBytes: 1
        }
      }
    });
  });

  it("returns a stable image metadata snapshot from a proxy-backed input", () => {
    let mimeType = "image/jpeg";
    let sizeBytes = 1;
    const image = new Proxy(
      {},
      {
        get(_target, property) {
          if (property === "mimeType") {
            return mimeType;
          }

          if (property === "sizeBytes") {
            return sizeBytes;
          }

          return undefined;
        }
      }
    );

    const result = validateSpaceInput({
      name: "Kitchen",
      image
    });

    expect(result).toMatchObject({ ok: true });

    mimeType = "image/gif";
    sizeBytes = 5 * 1024 * 1024 + 1;

    if (!result.ok) {
      throw new Error("Expected the initial proxy metadata to be valid.");
    }

    expect(result.data.image).not.toBe(image);
    expect(result.data.image).toEqual({
      mimeType: "image/jpeg",
      sizeBytes: 1
    });
  });

  it("rejects an empty or whitespace-only space name", () => {
    const result = validateSpaceInput({
      name: " \t\n ",
      image: {
        mimeType: "image/jpeg",
        sizeBytes: 1
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SPACE_NAME_REQUIRED",
        message: "A space name is required."
      }
    });
  });

  it("rejects a space name longer than 50 characters after trimming", () => {
    const result = validateSpaceInput({
      name: `${"a".repeat(51)} `,
      image: {
        mimeType: "image/jpeg",
        sizeBytes: 1
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SPACE_NAME_TOO_LONG",
        message: "A space name must be 50 characters or fewer."
      }
    });
  });

  it.each([
    ["image/jpeg", true],
    ["image/png", true],
    ["image/webp", true],
    ["image/gif", false]
  ])("accepts only supported space image MIME types: %s", (mimeType, accepted) => {
    const result = validateSpaceInput({
      name: "Kitchen",
      image: {
        mimeType,
        sizeBytes: 1
      }
    });

    if (accepted) {
      expect(result).toMatchObject({ ok: true });
      return;
    }

    expect(result).toEqual({
      ok: false,
      error: {
        code: "UNSUPPORTED_SPACE_IMAGE_TYPE",
        message: "A space image must be a JPEG, PNG, or WebP file."
      }
    });
  });

  it.each([
    [5 * 1024 * 1024, true],
    [5 * 1024 * 1024 + 1, false]
  ])("accepts space images no larger than 5 MiB: %i bytes", (sizeBytes, accepted) => {
    const result = validateSpaceInput({
      name: "Kitchen",
      image: {
        mimeType: "image/jpeg",
        sizeBytes
      }
    });

    if (accepted) {
      expect(result).toMatchObject({ ok: true });
      return;
    }

    expect(result).toEqual({
      ok: false,
      error: {
        code: "SPACE_IMAGE_TOO_LARGE",
        message: "A space image must be 5 MiB or smaller."
      }
    });
  });
});
