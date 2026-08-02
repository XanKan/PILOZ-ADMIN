import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin profile security settings", () => {
  const source = readFileSync(resolve(process.cwd(), "src/pages/SettingsPage.tsx"), "utf8");

  it("exposes a self-service MFA reset flow for the connected platform admin", () => {
    expect(source).toContain("Refaire ma 2FA");
    expect(source).toContain("profile.mfa_reset");
    expect(source).toContain('signOut({ scope: "global" })');
    expect(source).toContain("nouveau QR code");
  });
});
