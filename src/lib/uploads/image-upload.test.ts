import { describe, expect, it } from "vitest";

import { validateImageUpload } from "./image-upload";

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

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

function uint16LittleEndian(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function uint32BigEndian(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  ]);
}

function uint32LittleEndian(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff
  ]);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const checksum = crc32(concatBytes(typeBytes, data));

  return concatBytes(
    uint32BigEndian(data.length),
    typeBytes,
    data,
    uint32BigEndian(checksum)
  );
}

function createPng(
  width: number,
  height: number,
  additionalChunks: Uint8Array[] = []
): Uint8Array {
  const ihdr = concatBytes(
    uint32BigEndian(width),
    uint32BigEndian(height),
    new Uint8Array([8, 6, 0, 0, 0])
  );

  return concatBytes(
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    ...additionalChunks,
    pngChunk("IDAT", new Uint8Array([0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01])),
    pngChunk("IEND", new Uint8Array())
  );
}

function createJpeg(
  width: number,
  height: number,
  scanDataLength = 1,
  additionalSegments: Uint8Array[] = []
): Uint8Array {
  const startOfFrame = concatBytes(
    new Uint8Array([0xff, 0xc0]),
    uint16BigEndian(17),
    new Uint8Array([8]),
    uint16BigEndian(height),
    uint16BigEndian(width),
    new Uint8Array([
      3,
      1,
      0x11,
      0,
      2,
      0x11,
      0,
      3,
      0x11,
      0
    ])
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
  const prefix = concatBytes(
    new Uint8Array([0xff, 0xd8]),
    ...additionalSegments,
    startOfFrame,
    startOfScan
  );
  const bytes = new Uint8Array(prefix.length + scanDataLength + 2);

  bytes.set(prefix);
  bytes.set([0xff, 0xd9], prefix.length + scanDataLength);

  return bytes;
}

function jpegCommentSegment(): Uint8Array {
  return new Uint8Array([0xff, 0xfe, 0, 3, 0]);
}

function createWebp(
  width: number,
  height: number,
  trailingChunks: Uint8Array[] = []
): Uint8Array {
  const imagePayload = concatBytes(
    new Uint8Array([0, 0, 0, 0x9d, 0x01, 0x2a]),
    uint16LittleEndian(width),
    uint16LittleEndian(height)
  );
  const imageChunk = concatBytes(
    new TextEncoder().encode("VP8 "),
    uint32LittleEndian(imagePayload.length),
    imagePayload
  );
  const body = concatBytes(
    new TextEncoder().encode("WEBP"),
    imageChunk,
    ...trailingChunks
  );

  return concatBytes(
    new TextEncoder().encode("RIFF"),
    uint32LittleEndian(body.length),
    body
  );
}

function webpChunk(type: string, data: Uint8Array): Uint8Array {
  const padding = data.length % 2 === 0 ? new Uint8Array() : new Uint8Array([0]);

  return concatBytes(
    new TextEncoder().encode(type),
    uint32LittleEndian(data.length),
    data,
    padding
  );
}

function createWebpWithLeadingMetadata(width: number, height: number): Uint8Array {
  const baseImage = createWebp(width, height);
  const metadata = new TextEncoder().encode("<x/>");
  const metadataChunk = concatBytes(
    new TextEncoder().encode("XMP "),
    uint32LittleEndian(metadata.length),
    metadata
  );
  const body = concatBytes(
    new TextEncoder().encode("WEBP"),
    metadataChunk,
    baseImage.slice(12)
  );

  return concatBytes(
    new TextEncoder().encode("RIFF"),
    uint32LittleEndian(body.length),
    body
  );
}

function createSizedJpeg(byteLength: number): Uint8Array {
  const minimum = createJpeg(1, 1, 0);

  return createJpeg(1, 1, byteLength - minimum.length);
}

describe("validateImageUpload", () => {
  it("returns a precise error when the upload input itself is malformed", () => {
    expect(() => validateImageUpload(null)).not.toThrow();
    expect(validateImageUpload(null)).toEqual({
      ok: false,
      error: {
        code: "INVALID_IMAGE_BYTES",
        message: "Image bytes must be provided as a Uint8Array."
      }
    });
  });

  it("returns a precise error when bytes are null instead of throwing", () => {
    const input = { metadata: null, bytes: null };

    expect(() => validateImageUpload(input)).not.toThrow();
    expect(validateImageUpload(input)).toEqual({
      ok: false,
      error: {
        code: "INVALID_IMAGE_BYTES",
        message: "Image bytes must be provided as a Uint8Array."
      }
    });
  });

  it("rejects a bytes-shaped object that is not a real Uint8Array", () => {
    expect(
      validateImageUpload({
        metadata: null,
        bytes: { byteLength: 24, 0: 0xff, 1: 0xd8, 2: 0xff }
      })
    ).toMatchObject({
      ok: false,
      error: { code: "INVALID_IMAGE_BYTES" }
    });
  });

  it("accepts a structurally complete JPEG and derives its dimensions without trusting metadata", () => {
    const untrustedMetadata = new Proxy(
      {},
      {
        get() {
          throw new Error("Upload metadata must not be read as authoritative.");
        }
      }
    );
    const bytes = createJpeg(640, 480);

    const result = validateImageUpload({
      metadata: untrustedMetadata,
      bytes
    });

    expect(result).toEqual({
      ok: true,
      data: {
        format: "JPEG",
        byteLength: bytes.byteLength,
        width: 640,
        height: 480
      }
    });
  });

  it("accepts a structurally complete PNG and derives its dimensions", () => {
    const bytes = createPng(400, 300);

    expect(validateImageUpload({ metadata: null, bytes })).toEqual({
      ok: true,
      data: {
        format: "PNG",
        byteLength: bytes.byteLength,
        width: 400,
        height: 300
      }
    });
  });

  it("accepts a structurally complete WebP and derives its dimensions", () => {
    const bytes = createWebp(1280, 720);

    expect(validateImageUpload({ metadata: undefined, bytes })).toEqual({
      ok: true,
      data: {
        format: "WEBP",
        byteLength: bytes.byteLength,
        width: 1280,
        height: 720
      }
    });
  });

  it("accepts a WebP when a metadata chunk precedes its image chunk", () => {
    const bytes = createWebpWithLeadingMetadata(320, 200);

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: true,
      data: {
        format: "WEBP",
        width: 320,
        height: 200
      }
    });
  });

  it("rejects bytes larger than 5 MiB even when metadata declares a small file", () => {
    const bytes = createSizedJpeg(5 * 1024 * 1024 + 1);

    expect(
      validateImageUpload({
        metadata: { mimeType: "image/jpeg", sizeBytes: 1 },
        bytes
      })
    ).toEqual({
      ok: false,
      error: {
        code: "IMAGE_TOO_LARGE",
        message: "Image uploads must be 5 MiB or smaller."
      }
    });
  });

  it("accepts a valid image whose actual byte length is exactly 5 MiB", () => {
    const bytes = createSizedJpeg(5 * 1024 * 1024);

    expect(validateImageUpload({ metadata: null, bytes })).toEqual({
      ok: true,
      data: {
        format: "JPEG",
        byteLength: 5 * 1024 * 1024,
        width: 1,
        height: 1
      }
    });
  });

  it("rejects unsupported bytes despite a forged supported MIME type", () => {
    expect(
      validateImageUpload({
        metadata: { mimeType: "image/png", sizeBytes: 1 },
        bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38])
      })
    ).toEqual({
      ok: false,
      error: {
        code: "UNSUPPORTED_IMAGE_FORMAT",
        message: "Image uploads must be JPEG, PNG, or WebP files."
      }
    });
  });

  it("rejects a RIFF container that does not contain the WebP marker", () => {
    const bytes = new Uint8Array([
      0x52,
      0x49,
      0x46,
      0x46,
      0x04,
      0x00,
      0x00,
      0x00,
      0x57,
      0x41,
      0x56,
      0x45
    ]);

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "UNSUPPORTED_IMAGE_FORMAT" }
    });
  });

  it("rejects a JPEG that is truncated after a valid signature", () => {
    expect(
      validateImageUpload({
        metadata: null,
        bytes: new Uint8Array([0xff, 0xd8, 0xff])
      })
    ).toMatchObject({
      ok: false,
      error: { code: "MALFORMED_IMAGE_DATA" }
    });
  });

  it("rejects a PNG with a truncated IHDR chunk", () => {
    expect(
      validateImageUpload({
        metadata: null,
        bytes: PNG_SIGNATURE
      })
    ).toMatchObject({
      ok: false,
      error: { code: "MALFORMED_IMAGE_DATA" }
    });
  });

  it("rejects a WebP whose declared RIFF length does not match its bytes", () => {
    const bytes = createWebp(20, 20);
    bytes[4] += 1;

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "MALFORMED_IMAGE_DATA" }
    });
  });

  it("rejects an APNG container rather than accepting an animated space image", () => {
    const bytes = createPng(1, 1, [
      pngChunk("acTL", new Uint8Array([0, 0, 0, 2, 0, 0, 0, 0]))
    ]);

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "MALFORMED_IMAGE_DATA" }
    });
  });

  it("rejects an animated WebP container rather than accepting an animated space image", () => {
    const bytes = createWebp(20, 20, [
      webpChunk("ANIM", new Uint8Array([0, 0, 0, 0, 0, 0]))
    ]);

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "MALFORMED_IMAGE_DATA" }
    });
  });

  it("rejects a JPEG with more than 1,024 marker segments", () => {
    const bytes = createJpeg(
      1,
      1,
      1,
      Array.from({ length: 1_023 }, jpegCommentSegment)
    );

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "MALFORMED_IMAGE_DATA" }
    });
  });

  it("rejects a PNG with more than 1,024 chunks", () => {
    const bytes = createPng(
      1,
      1,
      Array.from({ length: 1_022 }, () => pngChunk("ruSt", new Uint8Array()))
    );

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "MALFORMED_IMAGE_DATA" }
    });
  });

  it("rejects a WebP with more than 1,024 chunks", () => {
    const bytes = createWebp(
      1,
      1,
      Array.from({ length: 1_024 }, () => webpChunk("XMP ", new Uint8Array()))
    );

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "MALFORMED_IMAGE_DATA" }
    });
  });

  it("accepts an image at the 8,192-pixel width boundary", () => {
    const bytes = createJpeg(8192, 1);

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: true,
      data: { width: 8192, height: 1 }
    });
  });

  it("rejects an image wider than 8,192 pixels", () => {
    const bytes = createJpeg(8193, 1);

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "IMAGE_DIMENSIONS_EXCEED_LIMIT" }
    });
  });

  it("accepts an image at the 40-megapixel boundary", () => {
    const bytes = createPng(8000, 5000);

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: true,
      data: { width: 8000, height: 5000 }
    });
  });

  it("rejects an image above the 40-megapixel boundary", () => {
    const bytes = createPng(8000, 5001);

    expect(validateImageUpload({ metadata: null, bytes })).toMatchObject({
      ok: false,
      error: { code: "IMAGE_DIMENSIONS_EXCEED_LIMIT" }
    });
  });
});
