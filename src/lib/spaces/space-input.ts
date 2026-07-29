export type SpaceImageInput = {
  mimeType: string;
  sizeBytes: number;
};

export type SpaceInput = {
  name: string;
  image: SpaceImageInput;
};

export type ValidatedSpaceInput = {
  name: string;
  image: SpaceImageInput;
};

export type SpaceValidationErrorCode =
  | "SPACE_INPUT_INVALID"
  | "SPACE_NAME_INVALID"
  | "SPACE_NAME_REQUIRED"
  | "SPACE_NAME_TOO_LONG"
  | "SPACE_IMAGE_INVALID"
  | "SPACE_IMAGE_SIZE_INVALID"
  | "UNSUPPORTED_SPACE_IMAGE_TYPE"
  | "SPACE_IMAGE_TOO_LARGE";

export type SpaceValidationError = {
  code: SpaceValidationErrorCode;
  message: string;
};

export type SpaceValidationResult =
  | {
      ok: true;
      data: ValidatedSpaceInput;
    }
  | {
      ok: false;
      error: SpaceValidationError;
    };

const supportedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSpaceInputInternal(input: unknown): SpaceValidationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      error: {
        code: "SPACE_INPUT_INVALID",
        message: "Space input must be an object."
      }
    };
  }

  const spaceInput = input as SpaceInput;

  if (typeof spaceInput.name !== "string") {
    return {
      ok: false,
      error: {
        code: "SPACE_NAME_INVALID",
        message: "A space name must be text."
      }
    };
  }

  const name = spaceInput.name.trim();

  if (!name) {
    return {
      ok: false,
      error: {
        code: "SPACE_NAME_REQUIRED",
        message: "A space name is required."
      }
    };
  }

  if (name.length > 50) {
    return {
      ok: false,
      error: {
        code: "SPACE_NAME_TOO_LONG",
        message: "A space name must be 50 characters or fewer."
      }
    };
  }

  const imageInput = spaceInput.image;

  if (!isRecord(imageInput)) {
    return {
      ok: false,
      error: {
        code: "SPACE_IMAGE_INVALID",
        message: "A space image must be an object."
      }
    };
  }

  const image = imageInput as SpaceImageInput;
  const mimeType = image.mimeType;

  if (typeof mimeType !== "string") {
    return {
      ok: false,
      error: {
        code: "SPACE_IMAGE_INVALID",
        message: "A space image must include a MIME type."
      }
    };
  }

  if (!supportedImageMimeTypes.includes(mimeType)) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_SPACE_IMAGE_TYPE",
        message: "A space image must be a JPEG, PNG, or WebP file."
      }
    };
  }

  // This validates client-provided image metadata for UX only. Server upload
  // handling must independently verify the actual file bytes.
  const sizeBytes = image.sizeBytes;

  if (
    typeof sizeBytes !== "number" ||
    !Number.isFinite(sizeBytes) ||
    !Number.isInteger(sizeBytes) ||
    sizeBytes < 0
  ) {
    return {
      ok: false,
      error: {
        code: "SPACE_IMAGE_SIZE_INVALID",
        message: "A space image size must be a non-negative whole number of bytes."
      }
    };
  }

  if (sizeBytes > 5 * 1024 * 1024) {
    return {
      ok: false,
      error: {
        code: "SPACE_IMAGE_TOO_LARGE",
        message: "A space image must be 5 MiB or smaller."
      }
    };
  }

  return {
    ok: true,
    data: {
      name,
      image: {
        mimeType,
        sizeBytes
      }
    }
  };
}

export function validateSpaceInput(input: unknown): SpaceValidationResult {
  try {
    return validateSpaceInputInternal(input);
  } catch {
    return {
      ok: false,
      error: {
        code: "SPACE_INPUT_INVALID",
        message: "Space input must be an object."
      }
    };
  }
}
