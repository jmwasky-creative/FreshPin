import "server-only";

import sharp from "sharp";

import {
  MAX_IMAGE_PIXELS,
  validateImageUpload,
  type ImageFormat,
  type ImageUploadValidationErrorCode,
  type ImageUploadValidationResult,
  type ValidatedImageUpload
} from "./image-upload";

export type ServerImageValidationErrorCode =
  | ImageUploadValidationErrorCode
  | "ANIMATED_IMAGE_UNSUPPORTED"
  | "IMAGE_DECODE_FAILED";

export type ServerImageValidationResult =
  | {
      ok: true;
      data: ValidatedImageUpload;
    }
  | {
      ok: false;
      error: {
        code: ServerImageValidationErrorCode;
        message: string;
      };
    };

function failure(
  code: ServerImageValidationErrorCode,
  message: string
): ServerImageValidationResult {
  return { ok: false, error: { code, message } };
}

function getImageBytes(input: unknown): Uint8Array | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  try {
    const bytes = (input as { bytes?: unknown }).bytes;

    return bytes instanceof Uint8Array ? bytes : null;
  } catch {
    return null;
  }
}

function isSuccessful(
  result: ImageUploadValidationResult
): result is Extract<ImageUploadValidationResult, { ok: true }> {
  return result.ok;
}

function getExpectedSharpFormat(format: ImageFormat): string {
  return format.toLowerCase();
}

/**
 * Runs the header/container preflight and then decodes a static image on the
 * server. Call this before persisting any user-supplied image bytes.
 */
export async function validateImageForStorage(
  input: unknown
): Promise<ServerImageValidationResult> {
  const bytes = getImageBytes(input);
  const preflightResult = validateImageUpload({ bytes, metadata: undefined });

  if (!isSuccessful(preflightResult)) {
    return preflightResult;
  }

  if (!bytes) {
    return failure(
      "INVALID_IMAGE_BYTES",
      "Image bytes must be provided as a Uint8Array."
    );
  }

  try {
    const image = sharp(bytes, {
      failOn: "warning",
      limitInputPixels: MAX_IMAGE_PIXELS,
      pages: 1,
      sequentialRead: true
    });
    const metadata = await image.metadata();

    if (
      metadata.format !== getExpectedSharpFormat(preflightResult.data.format) ||
      metadata.width !== preflightResult.data.width ||
      metadata.height !== preflightResult.data.height
    ) {
      return failure(
        "IMAGE_DECODE_FAILED",
        "Image data could not be safely decoded."
      );
    }

    if ((metadata.pages ?? 1) > 1) {
      return failure(
        "ANIMATED_IMAGE_UNSUPPORTED",
        "Animated image uploads are not supported."
      );
    }

    await image
      .clone()
      .resize({ height: 1, fit: "fill", width: 1 })
      .png()
      .toBuffer();

    return { ok: true, data: preflightResult.data };
  } catch {
    return failure(
      "IMAGE_DECODE_FAILED",
      "Image data could not be safely decoded."
    );
  }
}
