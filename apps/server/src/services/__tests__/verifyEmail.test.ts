import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { verifyEmail } from "../authService";
import { User } from "../../models/user";
import { generateTokenPair } from "../../utils/jwt";

const mockedUser = jest.mocked(User);
const mockedGenerateTokenPair = jest.mocked(generateTokenPair);

const mockSave = () => jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.mock("../../models/user", () => ({
  User: {
    findOne: jest.fn(),
  },
}));

jest.mock("../../utils/jwt", () => ({
  generateTokenPair: jest.fn(),
  generateRandomToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

// ממוקקים כדי שהמודול האמיתי (שדורש ENCRYPTION_KEY בזמן טעינה) לא ייטען בכלל
jest.mock("../../utils/crypto", () => ({
  encryptSecret: jest.fn(),
  generateApiKey: jest.fn(),
  getKeyPrefix: jest.fn(),
  hashApiKey: jest.fn(),
}));

jest.mock("../../utils/email", () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("axios");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

describe("authService.verifyEmail (AUTH-03)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGenerateTokenPair.mockReturnValue({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    });
  });

  it("should mark user as verified, clear token, and log user in when token is valid", async () => {
    const mockUser = {
      _id: { toString: () => "user-1" },
      email: "foo@bar.baz",
      role: "user",
      emailVerified: false,
      verificationToken: "valid-verification-token",
      verificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
      refreshTokens: [] as string[],
      save: mockSave(),
    };

    mockedUser.findOne.mockResolvedValue(mockUser);

    const result = await verifyEmail("valid-verification-token");

    expect(User.findOne).toHaveBeenCalledWith({
      verificationToken: "valid-verification-token",
      verificationTokenExpires: { $gt: expect.any(Date) },
    });

    expect(mockUser.emailVerified).toBe(true);
    expect(mockUser.verificationToken).toBeNull();
    expect(mockUser.verificationTokenExpires).toBeNull();

    expect(generateTokenPair).toHaveBeenCalledWith({
      userId: "user-1",
      email: "foo@bar.baz",
      role: "user",
    });

    expect(mockUser.refreshTokens).toContain("mock-refresh-token");
    expect(mockUser.save).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      user: mockUser,
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    });
  });

  it("should throw error if token does not exist or has expired", async () => {
    mockedUser.findOne.mockResolvedValue(null);

    await expect(verifyEmail("invalid-or-expired-token")).rejects.toThrow(
      "קישור האימות אינו תקף או שפג תוקפו"
    );

    expect(generateTokenPair).not.toHaveBeenCalled();
  });

  it("should keep only the last 5 refresh tokens after verification", async () => {
    const mockUser = {
      _id: { toString: () => "user-1" },
      email: "foo@bar.baz",
      role: "user",
      emailVerified: false,
      verificationToken: "valid-verification-token",
      verificationTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
      refreshTokens: ["t1", "t2", "t3", "t4", "t5"],
      save: mockSave(),
    };

    mockedUser.findOne.mockResolvedValue(mockUser);

    await verifyEmail("valid-verification-token");

    expect(mockUser.refreshTokens).toHaveLength(5);
    expect(mockUser.refreshTokens).toEqual([
      "t2",
      "t3",
      "t4",
      "t5",
      "mock-refresh-token",
    ]);
  });
});
