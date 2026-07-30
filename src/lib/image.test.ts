import { describe, expect, it } from "vitest";
import { detectImageMime } from "@/lib/image";

describe("detectImageMime", () => {
  it("detects JPEG", () => {
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
  });

  it("detects PNG", () => {
    expect(
      detectImageMime(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
  });

  it("detects WebP", () => {
    expect(
      detectImageMime(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe("image/webp");
  });

  it("rejects unsupported or spoofed content", () => {
    expect(detectImageMime(new TextEncoder().encode("not an image"))).toBeNull();
  });
});
