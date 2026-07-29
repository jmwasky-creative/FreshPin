export type ImageFormat = "JPEG" | "PNG" | "WEBP";

export type ImageUploadInput = {
  metadata: unknown;
  bytes: unknown;
};

export type ValidatedImageUpload = {
  format: ImageFormat;
  byteLength: number;
  width: number;
  height: number;
};

export type ImageUploadValidationErrorCode =
  | "INVALID_IMAGE_BYTES"
  | "UNSUPPORTED_IMAGE_FORMAT"
  | "MALFORMED_IMAGE_DATA"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_DIMENSIONS_EXCEED_LIMIT";

export type ImageUploadValidationResult =
  | {
      ok: true;
      data: ValidatedImageUpload;
    }
  | {
      ok: false;
      error: {
        code: ImageUploadValidationErrorCode;
        message: string;
      };
    };

type ImageDimensions = {
  width: number;
  height: number;
};

type ParsedImage = ImageDimensions & {
  format: ImageFormat;
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 8_192;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_IMAGE_STRUCTURE_PARTS = 1_024;
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const crc32Table = createCrc32Table();

function failure(
  code: ImageUploadValidationErrorCode,
  message: string
): ImageUploadValidationResult {
  return {
    ok: false,
    error: { code, message }
  };
}

function hasBytesAt(
  bytes: Uint8Array,
  offset: number,
  expected: readonly number[]
): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function readUint16BigEndian(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) {
    return null;
  }

  return bytes[offset] * 0x100 + bytes[offset + 1];
}

function readUint16LittleEndian(
  bytes: Uint8Array,
  offset: number
): number | null {
  if (offset < 0 || offset + 2 > bytes.length) {
    return null;
  }

  return bytes[offset] + bytes[offset + 1] * 0x100;
}

function readUint24LittleEndian(
  bytes: Uint8Array,
  offset: number
): number | null {
  if (offset < 0 || offset + 3 > bytes.length) {
    return null;
  }

  return (
    bytes[offset] + bytes[offset + 1] * 0x100 + bytes[offset + 2] * 0x10000
  );
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) {
    return null;
  }

  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function readUint32LittleEndian(
  bytes: Uint8Array,
  offset: number
): number | null {
  if (offset < 0 || offset + 4 > bytes.length) {
    return null;
  }

  return (
    bytes[offset] +
    bytes[offset + 1] * 0x100 +
    bytes[offset + 2] * 0x10000 +
    bytes[offset + 3] * 0x1000000
  );
}

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let value = 0; value < table.length; value += 1) {
    let crc = value;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }

    table[value] = crc >>> 0;
  }

  return table;
}

function isRealUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array && ArrayBuffer.isView(value);
}

function getImageBytes(input: unknown): Uint8Array | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  try {
    const bytes = (input as { bytes?: unknown }).bytes;

    return isRealUint8Array(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

function isJpegStartOfFrameMarker(marker: number): boolean {
  return (
    marker === 0xc0 ||
    marker === 0xc1 ||
    marker === 0xc2 ||
    marker === 0xc3 ||
    marker === 0xc5 ||
    marker === 0xc6 ||
    marker === 0xc7 ||
    marker === 0xc9 ||
    marker === 0xca ||
    marker === 0xcb ||
    marker === 0xcd ||
    marker === 0xce ||
    marker === 0xcf
  );
}

function parseJpegStartOfFrame(
  bytes: Uint8Array,
  segmentOffset: number,
  segmentLength: number
): ImageDimensions | null {
  if (segmentLength < 11) {
    return null;
  }

  const precision = bytes[segmentOffset + 2];
  const height = readUint16BigEndian(bytes, segmentOffset + 3);
  const width = readUint16BigEndian(bytes, segmentOffset + 5);
  const componentCount = bytes[segmentOffset + 7];

  if (
    (precision !== 8 && precision !== 12) ||
    height === null ||
    width === null ||
    height === 0 ||
    width === 0 ||
    componentCount === 0 ||
    segmentLength !== 8 + componentCount * 3
  ) {
    return null;
  }

  return { width, height };
}

function hasJpegEndOfImage(bytes: Uint8Array, scanDataOffset: number): boolean {
  for (let offset = scanDataOffset; offset < bytes.length; offset += 1) {
    if (bytes[offset] !== 0xff) {
      continue;
    }

    let markerOffset = offset + 1;

    while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) {
      markerOffset += 1;
    }

    if (markerOffset >= bytes.length) {
      return false;
    }

    if (bytes[markerOffset] === 0xd9) {
      return markerOffset === bytes.length - 1;
    }

    offset = markerOffset;
  }

  return false;
}

function parseJpeg(bytes: Uint8Array): ImageDimensions | null {
  if (!hasBytesAt(bytes, 0, [0xff, 0xd8])) {
    return null;
  }

  let offset = 2;
  let dimensions: ImageDimensions | null = null;
  let segmentCount = 0;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null;
    }

    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.length) {
      return null;
    }

    const marker = bytes[offset];
    offset += 1;

    if (
      marker === 0x00 ||
      marker === 0x01 ||
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      return null;
    }

    const segmentLength = readUint16BigEndian(bytes, offset);

    if (segmentLength === null || segmentLength < 2) {
      return null;
    }

    segmentCount += 1;

    if (segmentCount > MAX_IMAGE_STRUCTURE_PARTS) {
      return null;
    }

    const segmentEnd = offset + segmentLength;

    if (segmentEnd > bytes.length) {
      return null;
    }

    if (isJpegStartOfFrameMarker(marker)) {
      const parsedDimensions = parseJpegStartOfFrame(
        bytes,
        offset,
        segmentLength
      );

      if (
        parsedDimensions === null ||
        (dimensions !== null &&
          (dimensions.width !== parsedDimensions.width ||
            dimensions.height !== parsedDimensions.height))
      ) {
        return null;
      }

      dimensions = parsedDimensions;
    }

    if (marker === 0xda) {
      const componentCount = bytes[offset + 2];

      if (
        dimensions === null ||
        componentCount === 0 ||
        segmentLength !== 6 + componentCount * 2
      ) {
        return null;
      }

      return hasJpegEndOfImage(bytes, segmentEnd) ? dimensions : null;
    }

    offset = segmentEnd;
  }

  return null;
}

function crc32(bytes: Uint8Array, offset: number, length: number): number {
  let crc = 0xffffffff;

  for (let index = offset; index < offset + length; index += 1) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ bytes[index]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function hasPngChunkType(
  bytes: Uint8Array,
  offset: number,
  type: readonly number[]
): boolean {
  return hasBytesAt(bytes, offset, type);
}

function hasValidPngHeader(bytes: Uint8Array, dataOffset: number): boolean {
  const bitDepth = bytes[dataOffset + 8];
  const colorType = bytes[dataOffset + 9];
  const compressionMethod = bytes[dataOffset + 10];
  const filterMethod = bytes[dataOffset + 11];
  const interlaceMethod = bytes[dataOffset + 12];
  const allowedBitDepthsByColorType: Record<number, readonly number[]> = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16]
  };
  const allowedBitDepths = allowedBitDepthsByColorType[colorType];

  return (
    allowedBitDepths !== undefined &&
    allowedBitDepths.includes(bitDepth) &&
    compressionMethod === 0 &&
    filterMethod === 0 &&
    (interlaceMethod === 0 || interlaceMethod === 1)
  );
}

function parsePng(bytes: Uint8Array): ImageDimensions | null {
  if (!hasBytesAt(bytes, 0, pngSignature)) {
    return null;
  }

  let offset = pngSignature.length;
  let dimensions: ImageDimensions | null = null;
  let foundImageData = false;
  let isFirstChunk = true;
  let chunkCount = 0;

  while (offset < bytes.length) {
    chunkCount += 1;

    if (chunkCount > MAX_IMAGE_STRUCTURE_PARTS) {
      return null;
    }

    const chunkLength = readUint32BigEndian(bytes, offset);

    if (chunkLength === null || offset + 12 + chunkLength > bytes.length) {
      return null;
    }

    const typeOffset = offset + 4;
    const dataOffset = offset + 8;
    const checksumOffset = dataOffset + chunkLength;
    const expectedChecksum = readUint32BigEndian(bytes, checksumOffset);

    if (
      expectedChecksum === null ||
      crc32(bytes, typeOffset, 4 + chunkLength) !== expectedChecksum
    ) {
      return null;
    }

    if (
      hasPngChunkType(bytes, typeOffset, [0x61, 0x63, 0x54, 0x4c]) ||
      hasPngChunkType(bytes, typeOffset, [0x66, 0x63, 0x54, 0x4c]) ||
      hasPngChunkType(bytes, typeOffset, [0x66, 0x64, 0x41, 0x54])
    ) {
      return null;
    }

    if (hasPngChunkType(bytes, typeOffset, [0x49, 0x48, 0x44, 0x52])) {
      if (!isFirstChunk || chunkLength !== 13 || !hasValidPngHeader(bytes, dataOffset)) {
        return null;
      }

      const width = readUint32BigEndian(bytes, dataOffset);
      const height = readUint32BigEndian(bytes, dataOffset + 4);

      if (width === null || height === null || width === 0 || height === 0) {
        return null;
      }

      dimensions = { width, height };
    } else if (hasPngChunkType(bytes, typeOffset, [0x49, 0x44, 0x41, 0x54])) {
      if (dimensions === null || chunkLength === 0) {
        return null;
      }

      foundImageData = true;
    } else if (hasPngChunkType(bytes, typeOffset, [0x49, 0x45, 0x4e, 0x44])) {
      if (
        dimensions === null ||
        !foundImageData ||
        chunkLength !== 0 ||
        checksumOffset + 4 !== bytes.length
      ) {
        return null;
      }

      return dimensions;
    }

    offset = checksumOffset + 4;
    isFirstChunk = false;
  }

  return null;
}

function parseWebpVp8(bytes: Uint8Array, offset: number, length: number): ImageDimensions | null {
  if (
    length < 10 ||
    (bytes[offset] & 1) !== 0 ||
    !hasBytesAt(bytes, offset + 3, [0x9d, 0x01, 0x2a])
  ) {
    return null;
  }

  const widthWithScale = readUint16LittleEndian(bytes, offset + 6);
  const heightWithScale = readUint16LittleEndian(bytes, offset + 8);

  if (widthWithScale === null || heightWithScale === null) {
    return null;
  }

  const width = widthWithScale & 0x3fff;
  const height = heightWithScale & 0x3fff;

  return width > 0 && height > 0 ? { width, height } : null;
}

function parseWebpVp8l(
  bytes: Uint8Array,
  offset: number,
  length: number
): ImageDimensions | null {
  if (length < 5 || bytes[offset] !== 0x2f) {
    return null;
  }

  const packedDimensions = readUint32LittleEndian(bytes, offset + 1);

  if (packedDimensions === null || packedDimensions >>> 29 !== 0) {
    return null;
  }

  return {
    width: 1 + (packedDimensions & 0x3fff),
    height: 1 + ((packedDimensions >>> 14) & 0x3fff)
  };
}

function parseWebpVp8x(
  bytes: Uint8Array,
  offset: number,
  length: number
): ImageDimensions | null {
  if (
    length < 10 ||
    bytes[offset + 1] !== 0 ||
    bytes[offset + 2] !== 0 ||
    bytes[offset + 3] !== 0
  ) {
    return null;
  }

  const widthMinusOne = readUint24LittleEndian(bytes, offset + 4);
  const heightMinusOne = readUint24LittleEndian(bytes, offset + 7);

  if (widthMinusOne === null || heightMinusOne === null) {
    return null;
  }

  return {
    width: widthMinusOne + 1,
    height: heightMinusOne + 1
  };
}

function sameDimensions(
  first: ImageDimensions,
  second: ImageDimensions
): boolean {
  return first.width === second.width && first.height === second.height;
}

function parseWebp(bytes: Uint8Array): ImageDimensions | null {
  if (
    !hasBytesAt(bytes, 0, [0x52, 0x49, 0x46, 0x46]) ||
    !hasBytesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return null;
  }

  const riffLength = readUint32LittleEndian(bytes, 4);

  if (riffLength === null || riffLength !== bytes.length - 8) {
    return null;
  }

  let offset = 12;
  let canvasDimensions: ImageDimensions | null = null;
  let imageDimensions: ImageDimensions | null = null;
  let chunkCount = 0;

  while (offset < bytes.length) {
    chunkCount += 1;

    if (chunkCount > MAX_IMAGE_STRUCTURE_PARTS) {
      return null;
    }

    const chunkLength = readUint32LittleEndian(bytes, offset + 4);

    if (chunkLength === null) {
      return null;
    }

    const dataOffset = offset + 8;
    const chunkEnd = dataOffset + chunkLength;
    const paddedChunkEnd = chunkEnd + (chunkLength % 2);

    if (dataOffset > bytes.length || paddedChunkEnd > bytes.length) {
      return null;
    }

    const isVp8x = hasBytesAt(bytes, offset, [0x56, 0x50, 0x38, 0x58]);
    const isVp8 = hasBytesAt(bytes, offset, [0x56, 0x50, 0x38, 0x20]);
    const isVp8l = hasBytesAt(bytes, offset, [0x56, 0x50, 0x38, 0x4c]);
    const isAnimated =
      hasBytesAt(bytes, offset, [0x41, 0x4e, 0x49, 0x4d]) ||
      hasBytesAt(bytes, offset, [0x41, 0x4e, 0x4d, 0x46]);

    if (isAnimated) {
      return null;
    }

    if (isVp8x) {
      if (canvasDimensions !== null) {
        return null;
      }

      const parsedCanvasDimensions = parseWebpVp8x(
        bytes,
        dataOffset,
        chunkLength
      );

      if (parsedCanvasDimensions === null) {
        return null;
      }

      canvasDimensions = parsedCanvasDimensions;
    } else if (isVp8) {
      if (imageDimensions !== null) {
        return null;
      }

      const parsedImageDimensions = parseWebpVp8(
        bytes,
        dataOffset,
        chunkLength
      );

      if (parsedImageDimensions === null) {
        return null;
      }

      imageDimensions = parsedImageDimensions;
    } else if (isVp8l) {
      if (imageDimensions !== null) {
        return null;
      }

      const parsedImageDimensions = parseWebpVp8l(
        bytes,
        dataOffset,
        chunkLength
      );

      if (parsedImageDimensions === null) {
        return null;
      }

      imageDimensions = parsedImageDimensions;
    }

    offset = paddedChunkEnd;
  }

  if (offset !== bytes.length || imageDimensions === null) {
    return null;
  }

  if (
    canvasDimensions !== null &&
    !sameDimensions(canvasDimensions, imageDimensions)
  ) {
    return null;
  }

  return canvasDimensions ?? imageDimensions;
}

function parseImage(bytes: Uint8Array): ParsedImage | null | "UNSUPPORTED" {
  if (hasBytesAt(bytes, 0, [0xff, 0xd8])) {
    const dimensions = parseJpeg(bytes);

    return dimensions === null ? null : { format: "JPEG", ...dimensions };
  }

  if (hasBytesAt(bytes, 0, pngSignature)) {
    const dimensions = parsePng(bytes);

    return dimensions === null ? null : { format: "PNG", ...dimensions };
  }

  if (hasBytesAt(bytes, 0, [0x52, 0x49, 0x46, 0x46])) {
    if (bytes.length >= 12 && !hasBytesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50])) {
      return "UNSUPPORTED";
    }

    const dimensions = parseWebp(bytes);

    return dimensions === null ? null : { format: "WEBP", ...dimensions };
  }

  return "UNSUPPORTED";
}

function dimensionsExceedLimit({ width, height }: ImageDimensions): boolean {
  return (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  );
}

export function validateImageUpload(input: unknown): ImageUploadValidationResult {
  const bytes = getImageBytes(input);

  if (bytes === null) {
    return failure(
      "INVALID_IMAGE_BYTES",
      "Image bytes must be provided as a Uint8Array."
    );
  }

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return failure("IMAGE_TOO_LARGE", "Image uploads must be 5 MiB or smaller.");
  }

  const parsedImage = parseImage(bytes);

  if (parsedImage === "UNSUPPORTED") {
    return failure(
      "UNSUPPORTED_IMAGE_FORMAT",
      "Image uploads must be JPEG, PNG, or WebP files."
    );
  }

  if (parsedImage === null) {
    return failure(
      "MALFORMED_IMAGE_DATA",
      "Image bytes are truncated or malformed."
    );
  }

  if (dimensionsExceedLimit(parsedImage)) {
    return failure(
      "IMAGE_DIMENSIONS_EXCEED_LIMIT",
      "Image dimensions must be at most 8,192 pixels per side and 40 megapixels."
    );
  }

  return {
    ok: true,
    data: {
      format: parsedImage.format,
      byteLength: bytes.byteLength,
      width: parsedImage.width,
      height: parsedImage.height
    }
  };
}
