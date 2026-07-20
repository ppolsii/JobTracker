import { describe, expect, it, vi } from "vitest";

import { UserRepository } from "@/features/users/repositories/user.repository";
import { UserService } from "@/features/users/services/user.service";
import { ERROR_CODES } from "@/shared/constants/error-codes";

vi.mock("@/features/users/repositories/user.repository", () => ({
  UserRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

const mockedUsers = vi.mocked(UserRepository);

describe("UserService.getProfile", () => {
  it("returns Not Found when the profile row is missing", async () => {
    mockedUsers.findById.mockResolvedValue({
      data: null,
      error: null,
    } as never);

    const result = await UserService.getProfile("user-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
    }
  });

  it("returns the profile row on success", async () => {
    mockedUsers.findById.mockResolvedValue({
      data: { id: "user-1", full_name: "Jane Doe" },
      error: null,
    } as never);

    const result = await UserService.getProfile("user-1");

    expect(result).toEqual({
      success: true,
      data: { id: "user-1", full_name: "Jane Doe" },
    });
  });
});

describe("UserService.updateProfile", () => {
  it("trims the full name before persisting it (FEATURES.md: Editable Fields - Full Name)", async () => {
    mockedUsers.update.mockResolvedValue({
      data: { id: "user-1", full_name: "Jane Doe" },
      error: null,
    } as never);

    await UserService.updateProfile("user-1", "  Jane Doe  ");

    expect(mockedUsers.update).toHaveBeenCalledWith("user-1", {
      full_name: "Jane Doe",
    });
  });

  it("returns an error when the update fails", async () => {
    mockedUsers.update.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    } as never);

    const result = await UserService.updateProfile("user-1", "Jane Doe");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    }
  });
});
