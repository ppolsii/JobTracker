import { describe, expect, it } from "vitest";

import { isDeveloperAccount } from "@/features/billing/constants/developer-account";

describe("isDeveloperAccount", () => {
  it("matches the developer account's exact email", () => {
    expect(isDeveloperAccount("polgoca@gmail.com")).toBe(true);
  });

  it("does not match any other email", () => {
    expect(isDeveloperAccount("someone-else@example.com")).toBe(false);
  });

  it("is case-sensitive - a different-cased email does not match", () => {
    expect(isDeveloperAccount("Polgoca@Gmail.com")).toBe(false);
  });

  it("does not match a missing email", () => {
    expect(isDeveloperAccount(null)).toBe(false);
    expect(isDeveloperAccount(undefined)).toBe(false);
    expect(isDeveloperAccount("")).toBe(false);
  });
});
