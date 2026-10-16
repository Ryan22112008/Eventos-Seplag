import { afterEach, describe, expect, it, vi } from "vitest";
import { isDevMockMode } from "../../src/lib/dev-mode";

afterEach(() => vi.unstubAllEnvs());

describe("modo local de demonstração", () => {
  it.each([
    ["true", "development", true],
    ["false", "development", false],
    [undefined, "development", false],
    ["true", "production", false],
  ] as const)("DEV_MOCK_MODE=%s com NODE_ENV=%s retorna %s", (flag, nodeEnv, expected) => {
    vi.stubEnv("DEV_MOCK_MODE", flag ?? "");
    vi.stubEnv("NODE_ENV", nodeEnv);
    expect(isDevMockMode()).toBe(expected);
  });

  it("recusa inicializar Prisma enquanto o modo mock estiver ativo", async () => {
    vi.stubEnv("DEV_MOCK_MODE", "true");
    vi.stubEnv("NODE_ENV", "development");
    const { prisma } = await import("../../src/lib/prisma");
    expect(() => prisma.$connect()).toThrow("O acesso ao banco de dados está desativado em DEV_MOCK_MODE.");
  });
});
