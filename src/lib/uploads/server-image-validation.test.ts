/**
 * @vitest-environment node
 */

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { validateImageUpload } from "./image-upload";
import { validateImageForStorage } from "./server-image-validation";

type EncodedFormat = "jpeg" | "png" | "webp";

async function createDecodableImage(format: EncodedFormat): Promise<Uint8Array> {
  return sharp({
    create: {
      background: { alpha: 1, b: 56, g: 140, r: 16 },
      channels: 4,
      height: 3,
      width: 4
    }
  })
    .toFormat(format)
    .toBuffer();
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((length, part) => length + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function uint16BigEndian(value: number): Uint8Array {
  return new Uint8Array([(value >>> 8) & 0xff, value & 0xff]);
}

function createUndecodableButHeaderCompleteJpeg(): Uint8Array {
  const startOfFrame = concatBytes(
    new Uint8Array([0xff, 0xc0]),
    uint16BigEndian(17),
    new Uint8Array([8]),
    uint16BigEndian(1),
    uint16BigEndian(1),
    new Uint8Array([3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0])
  );
  const startOfScan = new Uint8Array([
    0xff,
    0xda,
    0,
    12,
    3,
    1,
    0,
    2,
    0x11,
    3,
    0x11,
    0,
    0x3f,
    0
  ]);

  return concatBytes(
    new Uint8Array([0xff, 0xd8]),
    startOfFrame,
    startOfScan,
    new Uint8Array([0, 0xff, 0xd9])
  );
}

describe("validateImageForStorage", () => {
  it.each([
    ["JPEG", "jpeg"],
    ["PNG", "png"],
    ["WebP", "webp"]
  ] as const)("accepts a real decodable %s image", async (_label, format) => {
    const bytes = await createDecodableImage(format);

    await expect(
      validateImageForStorage({ metadata: null, bytes })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        byteLength: bytes.byteLength,
        height: 3,
        width: 4
      }
    });
  });

  it("rejects a JPEG that passes header preflight but cannot be decoded", async () => {
    const bytes = createUndecodableButHeaderCompleteJpeg();

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: true,
      data: { format: "JPEG", height: 1, width: 1 }
    });

    await expect(
      validateImageForStorage({ metadata: null, bytes })
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "IMAGE_DECODE_FAILED",
        message: "Image data could not be safely decoded."
      }
    });
  });
});
