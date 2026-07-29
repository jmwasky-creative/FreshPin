export type ShelfLifeUnit = "DAY" | "MONTH" | "YEAR";

export type ShelfLife = {
  value: number;
  unit: ShelfLifeUnit;
};

export type ExpiryResolution = {
  expiryDate: string | null;
  source: "USER_CONFIRMED" | "RECOGNIZED" | "CALCULATED" | "UNKNOWN";
};

export type ItemStatus = "ACTIVE" | "USED" | "DISCARDED";

export type ExpiryDisplayState =
  | "NORMAL"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "UNKNOWN"
  | "USED"
  | "DISCARDED";

export type ExpiryDisplayInput = {
  itemStatus: ItemStatus;
  expiryDate: string | null;
  reminderDays: number;
  today: string;
};

type ExpiryResolutionInput = {
  confirmedExpiryDate?: string | null;
  recognizedExpiryDate?: string | null;
  productionDate?: string | null;
  shelfLife?: ShelfLife | null;
};

function isObjectLike(value: unknown): value is object {
  return value !== null && (typeof value === "object" || typeof value === "function");
}

function unknownExpiryResolution(): ExpiryResolution {
  return { expiryDate: null, source: "UNKNOWN" };
}

function toCalendarDateString(date: Date): string | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const value = date.toISOString().slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseCalendarDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (toCalendarDateString(date) !== value) {
    return null;
  }

  return date;
}

function hasValidShelfLife(value: ShelfLife | null | undefined): value is ShelfLife {
  return Boolean(
    value &&
      Number.isInteger(value.value) &&
      value.value > 0 &&
      ["DAY", "MONTH", "YEAR"].includes(value.unit)
  );
}

function resolveExpiryDateInternal(input: ExpiryResolutionInput): ExpiryResolution {
  const confirmedExpiryDate = parseCalendarDate(input.confirmedExpiryDate);

  if (confirmedExpiryDate) {
    return {
      expiryDate: confirmedExpiryDate.toISOString().slice(0, 10),
      source: "USER_CONFIRMED"
    };
  }

  const recognizedExpiryDate = parseCalendarDate(input.recognizedExpiryDate);

  if (recognizedExpiryDate) {
    return {
      expiryDate: recognizedExpiryDate.toISOString().slice(0, 10),
      source: "RECOGNIZED"
    };
  }

  const productionDate = parseCalendarDate(input.productionDate);

  if (productionDate && hasValidShelfLife(input.shelfLife)) {
    const expiryDate = productionDate;

    if (input.shelfLife.unit === "DAY") {
      expiryDate.setUTCDate(expiryDate.getUTCDate() + input.shelfLife.value);
    }

    if (input.shelfLife.unit === "MONTH") {
      const productionDay = expiryDate.getUTCDate();
      expiryDate.setUTCDate(1);
      expiryDate.setUTCMonth(expiryDate.getUTCMonth() + input.shelfLife.value);

      const lastDayOfTargetMonth = new Date(
        Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth() + 1, 0)
      ).getUTCDate();
      expiryDate.setUTCDate(Math.min(productionDay, lastDayOfTargetMonth));
    }

    if (input.shelfLife.unit === "YEAR") {
      const productionDay = expiryDate.getUTCDate();
      expiryDate.setUTCDate(1);
      expiryDate.setUTCFullYear(expiryDate.getUTCFullYear() + input.shelfLife.value);

      const lastDayOfTargetMonth = new Date(
        Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth() + 1, 0)
      ).getUTCDate();
      expiryDate.setUTCDate(Math.min(productionDay, lastDayOfTargetMonth));
    }

    const calculatedExpiryDate = toCalendarDateString(expiryDate);

    if (calculatedExpiryDate) {
      return { expiryDate: calculatedExpiryDate, source: "CALCULATED" };
    }
  }

  return unknownExpiryResolution();
}

export function resolveExpiryDate(input: ExpiryResolutionInput): ExpiryResolution;
export function resolveExpiryDate(input: unknown): ExpiryResolution;
export function resolveExpiryDate(input: unknown): ExpiryResolution {
  if (!isObjectLike(input)) {
    return unknownExpiryResolution();
  }

  try {
    return resolveExpiryDateInternal(input as ExpiryResolutionInput);
  } catch {
    return unknownExpiryResolution();
  }
}

function getExpiryDisplayStateInternal({
  itemStatus,
  expiryDate,
  reminderDays,
  today
}: ExpiryDisplayInput): ExpiryDisplayState {
  if (itemStatus === "USED") {
    return "USED";
  }

  if (itemStatus === "DISCARDED") {
    return "DISCARDED";
  }

  if (itemStatus !== "ACTIVE") {
    return "UNKNOWN";
  }

  if (!expiryDate) {
    return "UNKNOWN";
  }

  const parsedExpiryDate = parseCalendarDate(expiryDate);
  const parsedToday = parseCalendarDate(today);

  if (
    !parsedExpiryDate ||
    !parsedToday ||
    !Number.isInteger(reminderDays) ||
    reminderDays < 0
  ) {
    return "UNKNOWN";
  }

  if (parsedToday.getTime() > parsedExpiryDate.getTime()) {
    return "EXPIRED";
  }

  const reminderDate = new Date(parsedExpiryDate);
  reminderDate.setUTCDate(reminderDate.getUTCDate() - reminderDays);

  if (Number.isNaN(reminderDate.getTime())) {
    return "UNKNOWN";
  }

  if (parsedToday.getTime() >= reminderDate.getTime()) {
    return "EXPIRING_SOON";
  }

  return "NORMAL";
}

export function getExpiryDisplayState(input: ExpiryDisplayInput): ExpiryDisplayState;
export function getExpiryDisplayState(input: unknown): ExpiryDisplayState;
export function getExpiryDisplayState(input: unknown): ExpiryDisplayState {
  if (!isObjectLike(input)) {
    return "UNKNOWN";
  }

  try {
    return getExpiryDisplayStateInternal(input as ExpiryDisplayInput);
  } catch {
    return "UNKNOWN";
  }
}
