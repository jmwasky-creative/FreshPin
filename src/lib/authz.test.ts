import { describe, expect, it } from "vitest";
import { isAdminUser, mustChangePassword } from "@/lib/authz";

describe("authorization metadata", () => {
  it("recognizes only server-controlled admin metadata", () => {
    expect(isAdminUser({ app_metadata: { role: "admin" } })).toBe(true);
    expect(isAdminUser({ app_metadata: { role: "user" } })).toBe(false);
  });

  it("requires a password change only for an explicit true flag", () => {
    expect(mustChangePassword({ app_metadata: { must_change_password: true } })).toBe(true);
    expect(mustChangePassword({ app_metadata: { must_change_password: "true" } })).toBe(false);
  });
});
