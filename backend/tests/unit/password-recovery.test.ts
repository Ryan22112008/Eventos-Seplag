import { describe, expect, it } from "vitest";
import { hashRecoveryToken } from "@backend/auth/recovery-token";

describe("token de recuperação de senha", () => {
  it("armazena um hash estável e irreversível em vez do token", () => {
    const token = "random-recovery-token-with-sufficient-length-for-testing";
    expect(hashRecoveryToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRecoveryToken(token)).toBe(hashRecoveryToken(token));
    expect(hashRecoveryToken(token)).not.toBe(token);
  });
});
