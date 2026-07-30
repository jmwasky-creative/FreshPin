import type { RecognitionDraft, ShelfLifeUnit } from "@/types/domain";
import { isIsoDate } from "@/lib/date";

const DATE_RE = /(20\d{2})[年.\-/](0?[1-9]|1[0-2])[月.\-/](3[01]|[12]\d|0?[1-9])日?/;
const SHORT_DATE_RE = /\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/;

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (isIsoDate(trimmed)) return trimmed;
  const match = trimmed.match(DATE_RE) ?? trimmed.match(SHORT_DATE_RE);
  if (!match) return null;
  const result = `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
  return isIsoDate(result) ? result : null;
}

function deepFind(input: unknown, keys: string[]): unknown {
  if (!input || typeof input !== "object") return undefined;
  const queue: unknown[] = [input];
  const normalized = new Set(keys.map((key) => key.toLowerCase()));
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    for (const [key, value] of Object.entries(current)) {
      if (normalized.has(key.toLowerCase())) return value;
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return undefined;
}

function stringValue(input: unknown): string | null {
  if (typeof input === "string" && input.trim()) return input.trim();
  if (Array.isArray(input)) {
    const joined = input.filter((value) => typeof value === "string").join("\n").trim();
    return joined || null;
  }
  return null;
}

function parseShelfLife(value: unknown, rawText: string | null) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    const amount = Number(object.value ?? object.amount ?? object.number);
    const rawUnit = String(object.unit ?? "").toUpperCase();
    const unit = normalizeUnit(rawUnit);
    if (Number.isInteger(amount) && amount > 0 && unit) return { value: amount, unit };
  }

  const structuredMatch = typeof value === "string"
    ? value.match(/^\s*(\d{1,4})\s*(天|日|个月|月|年|days?|months?|years?)\s*$/i)
    : null;
  const textMatch = rawText?.match(/(?:保质期|保存期|shelf\s*life)\s*[:：]?\s*(\d{1,4})\s*(天|日|个月|月|年|days?|months?|years?)/i) ?? null;
  const match = structuredMatch ?? textMatch;
  if (!match) return null;
  const unit = normalizeUnit(match[2]);
  return unit ? { value: Number(match[1]), unit } : null;
}

function normalizeUnit(value: string): ShelfLifeUnit | null {
  const lower = value.toLowerCase();
  if (["day", "days", "天", "日"].includes(lower)) return "DAY";
  if (["month", "months", "个月", "月"].includes(lower)) return "MONTH";
  if (["year", "years", "年"].includes(lower)) return "YEAR";
  if (lower === "d") return "DAY";
  if (lower === "m") return "MONTH";
  if (lower === "y") return "YEAR";
  return null;
}

function dateNearKeyword(rawText: string | null, keywords: RegExp): string | null {
  if (!rawText) return null;
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    if (!keywords.test(line)) continue;
    const found = normalizeDate(line);
    if (found) return found;
  }
  return null;
}

export function normalizeRecognition(raw: unknown, provider: string): RecognitionDraft {
  const rawText = stringValue(
    deepFind(raw, ["rawText", "raw_text", "ocrText", "ocr_text", "text", "fullText", "full_text"]),
  ) ?? stringValue(raw);

  const structuredName = stringValue(
    deepFind(raw, ["name", "productName", "product_name", "itemName", "item_name", "label", "title"]),
  );
  const textName = rawText?.split(/\r?\n/).map((line) =>
    line.match(/(?:品名|商品名称|物品名称|product\s*name)\s*[:：]\s*(.{1,100})/i)?.[1]?.trim(),
  ).find(Boolean) ?? null;
  const name = structuredName ?? textName;

  const produceDate =
    normalizeDate(deepFind(raw, ["produceDate", "produce_date", "productionDate", "production_date", "manufactureDate", "manufacture_date", "mfgDate", "mfg_date"])) ??
    dateNearKeyword(rawText, /(生产日期|制造日期|出厂日期|mfg|manufactur)/i);

  const expireDate =
    normalizeDate(deepFind(raw, ["expireDate", "expire_date", "expiryDate", "expiry_date", "expirationDate", "expiration_date", "bestBefore", "best_before", "validUntil", "valid_until"])) ??
    dateNearKeyword(rawText, /(有效期至|保质期至|到期|失效|expiry|expiration|best before|valid until)/i);

  const shelfLife = parseShelfLife(
    deepFind(raw, ["shelfLife", "shelf_life", "validityPeriod", "validity_period"]),
    rawText,
  );

  const warnings: string[] = [];
  if (!name) warnings.push("未识别到物品名称，请手动填写。");
  if (!produceDate && !expireDate && !shelfLife) warnings.push("未识别到日期信息，请手动补充或选择日期未知。");

  return {
    name,
    produceDate,
    shelfLife,
    expireDate,
    rawText,
    warnings,
    provider,
  };
}
