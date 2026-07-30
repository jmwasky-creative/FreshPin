export type ItemInput = {
  name: string;
  locationId: string;
  expiryDate?: string | null;
};

export type ValidatedItemInput = {
  name: string;
  locationId: string;
  expiryDate: string | null;
};

export type ItemValidationErrorCode =
  | "ITEM_INPUT_INVALID"
  | "ITEM_NAME_INVALID"
  | "ITEM_NAME_REQUIRED"
  | "ITEM_NAME_TOO_LONG"
  | "ITEM_LOCATION_ID_INVALID"
  | "ITEM_LOCATION_ID_REQUIRED"
  | "ITEM_EXPIRY_DATE_INVALID";

export type ItemValidationError = {
  code: ItemValidationErrorCode;
  message: string;
};

export type ItemValidationResult =
  | {
      ok: true;
      data: ValidatedItemInput;
    }
  | {
      ok: false;
      error: ItemValidationError;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(code: ItemValidationErrorCode, message: string): ItemValidationResult {
  return {
    ok: false,
    error: { code, message }
  };
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function validateItemInputInternal(input: unknown): ItemValidationResult {
  if (!isRecord(input)) {
    return failure("ITEM_INPUT_INVALID", "Item input must be an object.");
  }

  const itemInput = input as ItemInput;

  if (typeof itemInput.name !== "string") {
    return failure("ITEM_NAME_INVALID", "An item name must be text.");
  }

  const name = itemInput.name.trim();

  if (!name) {
    return failure("ITEM_NAME_REQUIRED", "An item name is required.");
  }

  if (name.length > 100) {
    return failure("ITEM_NAME_TOO_LONG", "An item name must be 100 characters or fewer.");
  }

  if (typeof itemInput.locationId !== "string") {
    return failure("ITEM_LOCATION_ID_INVALID", "An item location ID must be text.");
  }

  const locationId = itemInput.locationId.trim();

  if (!locationId) {
    return failure("ITEM_LOCATION_ID_REQUIRED", "An item location ID is required.");
  }

  const expiryDateInput = itemInput.expiryDate;

  if (expiryDateInput !== undefined && expiryDateInput !== null) {
    if (typeof expiryDateInput !== "string" || !isCalendarDate(expiryDateInput)) {
      return failure(
        "ITEM_EXPIRY_DATE_INVALID",
        "An item expiry date must be a real YYYY-MM-DD calendar date."
      );
    }
  }

  return {
    ok: true,
    data: {
      name,
      locationId,
      expiryDate: expiryDateInput ?? null
    }
  };
}

export function validateItemInput(input: unknown): ItemValidationResult {
  try {
    return validateItemInputInternal(input);
  } catch {
    return failure("ITEM_INPUT_INVALID", "Item input must be an object.");
  }
}
