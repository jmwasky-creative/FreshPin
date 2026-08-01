import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { assertOwnedImagePath, createBrowserImageUrl } from "@/lib/storage";

const userId = "5f5f43ec-5e87-4b7b-91d7-bfb7db83c760";

describe("assertOwnedImagePath", () => {
  it("accepts a path inside the current user's folder", () => {
    expect(() =>
      assertOwnedImagePath(`${userId}/2026-07-30/image.jpg`, userId),
    ).not.toThrow();
  });

  it("allows a nullable optional image", () => {
    expect(() => assertOwnedImagePath(null, userId)).not.toThrow();
  });

  it("rejects another user's or malformed path", () => {
    expect(() =>
      assertOwnedImagePath("another-user/image.jpg", userId),
    ).toThrow(ApiError);
    expect(() =>
      assertOwnedImagePath(`${userId}/../image.jpg`, userId),
    ).toThrow(ApiError);
  });
});

describe("createBrowserImageUrl", () => {
  it("creates a stable, encoded URL for browser caching", () => {
    expect(createBrowserImageUrl("item-images", "user-1/2026-08-01/photo.webp")).toBe(
      "/api/images?bucket=item-images&path=user-1%2F2026-08-01%2Fphoto.webp",
    );
  });

  it("returns null when no image exists", () => {
    expect(createBrowserImageUrl("space-images", null)).toBeNull();
  });
});
