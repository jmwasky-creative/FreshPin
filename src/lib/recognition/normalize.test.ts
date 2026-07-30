import { describe, expect, it } from "vitest";
import { normalizeRecognition } from "@/lib/recognition/normalize";

describe("recognition normalization", () => {
  it("normalizes a structured result", () => {
    const result = normalizeRecognition(
      {
        product_name: "纯牛奶",
        production_date: "2026.07.20",
        shelf_life: "180天",
      },
      "test",
    );
    expect(result.name).toBe("纯牛奶");
    expect(result.produceDate).toBe("2026-07-20");
    expect(result.shelfLife).toEqual({ value: 180, unit: "DAY" });
  });

  it("extracts fields from OCR text", () => {
    const result = normalizeRecognition(
      { text: "品名：酸奶\n生产日期：2026年07月20日\n保质期 21 天" },
      "test",
    );
    expect(result.name).toBe("酸奶");
    expect(result.produceDate).toBe("2026-07-20");
    expect(result.shelfLife?.value).toBe(21);
  });
});
