import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../../src/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { requireAdmin, requireRole } from "../../src/auth/access";

describe("autorização server-side", () => {
  beforeEach(() => { mocks.getCurrentUser.mockReset(); mocks.redirect.mockClear(); });

  it("redireciona usuário anônimo para login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login");
  });

  it("bloqueia participante e organizador da área administrativa", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", perfil: "PARTICIPANTE" });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/participante");
    mocks.getCurrentUser.mockResolvedValue({ id: "u2", perfil: "ORGANIZADOR" });
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/organizador");
  });

  it("permite acesso administrativo somente a ADMIN", async () => {
    const admin = { id: "a1", perfil: "ADMIN", ativo: true };
    mocks.getCurrentUser.mockResolvedValue(admin);
    await expect(requireAdmin()).resolves.toEqual(admin);
    await expect(requireRole("ORGANIZADOR")).rejects.toThrow("REDIRECT:/admin");
  });
});
