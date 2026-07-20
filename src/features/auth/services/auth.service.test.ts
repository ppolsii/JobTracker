import { describe, expect, it, vi } from "vitest";

import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import { AuthService } from "@/features/auth/services/auth.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/auth/repositories/auth.repository", () => ({
  AuthRepository: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updatePassword: vi.fn(),
    getUser: vi.fn(),
  },
}));

const mockedAuth = vi.mocked(AuthRepository);

describe("AuthService.login", () => {
  it("translates Supabase's raw 'Invalid login credentials' into a friendly message", async () => {
    mockedAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    } as never);

    const result = await AuthService.login({
      email: "a@test.com",
      password: "wrong",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.UNAUTHENTICATED);
      expect(result.error.message).toBe("Invalid email or password.");
      // Never leaks the raw Supabase error text (BUSINESS_RULES.md "Error
      // Handling").
      expect(result.error.message).not.toContain("Invalid login credentials");
    }
  });

  it("translates a rate-limit error into a friendly, actionable message", async () => {
    mockedAuth.signInWithPassword.mockResolvedValue({
      error: { message: "email rate limit exceeded" },
    } as never);

    const result = await AuthService.login({
      email: "a@test.com",
      password: "x",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Too many attempts");
    }
  });

  it("succeeds when Supabase reports no error", async () => {
    mockedAuth.signInWithPassword.mockResolvedValue({ error: null } as never);

    const result = await AuthService.login({
      email: "a@test.com",
      password: "correct",
    });

    expect(result.success).toBe(true);
  });
});

describe("AuthService.register", () => {
  it("translates an 'already registered' error into a friendly conflict message", async () => {
    mockedAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    } as never);

    const result = await AuthService.register({
      fullName: "Jane Doe",
      email: "a@test.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        "An account with this email already exists."
      );
    }
  });

  it("detects a duplicate email via Supabase's empty-identities signal, even with no explicit error", async () => {
    mockedAuth.signUp.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    } as never);

    const result = await AuthService.register({
      fullName: "Jane Doe",
      email: "a@test.com",
      password: "password123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.CONFLICT);
    }
  });

  it("reports requiresEmailConfirmation=true when Supabase returns no session", async () => {
    mockedAuth.signUp.mockResolvedValue({
      data: { user: { identities: [{ id: "1" }] }, session: null },
      error: null,
    } as never);

    const result = await AuthService.register({
      fullName: "Jane Doe",
      email: "a@test.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: true,
      data: { requiresEmailConfirmation: true },
    });
  });

  it("reports requiresEmailConfirmation=false when Supabase returns an active session", async () => {
    mockedAuth.signUp.mockResolvedValue({
      data: {
        user: { identities: [{ id: "1" }] },
        session: { access_token: "token" },
      },
      error: null,
    } as never);

    const result = await AuthService.register({
      fullName: "Jane Doe",
      email: "a@test.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: true,
      data: { requiresEmailConfirmation: false },
    });
  });
});

describe("AuthService.requireUserId", () => {
  it("returns Unauthenticated when there is no current user", async () => {
    mockedAuth.getUser.mockResolvedValue(null as never);

    const result = await AuthService.requireUserId();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.UNAUTHENTICATED);
    }
  });

  it("returns the user id when a user is authenticated", async () => {
    mockedAuth.getUser.mockResolvedValue({ id: "user-1" } as never);

    const result = await AuthService.requireUserId();

    expect(result).toEqual({ success: true, data: "user-1" });
  });
});
