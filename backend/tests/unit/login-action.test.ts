import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  verify: vi.fn(),
  createSession: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
  rate: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 })),
  reset: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@backend/lib/prisma", () => ({ prisma: { usuario: { findUnique: mocks.findUnique } } }));
vi.mock("argon2", () => ({ verify: mocks.verify }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "127.0.0.1" }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@backend/auth/session", () => ({ createSession: mocks.createSession, destroyCurrentSession: vi.fn() }));
vi.mock("@backend/auth/rate-limit", () => ({ consumeRateLimit: mocks.rate, resetRateLimit: mocks.reset }));

import { loginAction } from "../../src/server/actions/auth";

function form(email = " ANA@EXAMPLE.ORG ", senha = "senha-segura-123") {
  const data = new FormData(); data.set("email", email); data.set("senha", senha); return data;
}

describe("ação de login", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset(); mocks.verify.mockReset(); mocks.createSession.mockReset();
    mocks.redirect.mockClear(); mocks.rate.mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 1000 }); mocks.reset.mockReset();
  });

  it("normaliza email, cria sessão e redireciona pelo perfil do banco", async () => {
    mocks.findUnique.mockResolvedValue({ id: "p1", perfil: "PARTICIPANTE", ativo: true, senhaHash: "argon-hash" });
    mocks.verify.mockResolvedValue(true);
    await expect(loginAction(form())).rejects.toThrow("REDIRECT:/participante");
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "ana@example.org" } }));
    expect(mocks.createSession).toHaveBeenCalledWith("p1");
    expect(mocks.reset).toHaveBeenCalled();
  });

  it("direciona perfil ADMIN e ORGANIZADOR segundo o perfil lido do banco", async () => {
    mocks.verify.mockResolvedValue(true);
    mocks.findUnique.mockResolvedValue({ id: "a1", perfil: "ADMIN", ativo: true, senhaHash: "argon-hash" });
    await expect(loginAction(form())).rejects.toThrow("REDIRECT:/admin");
    mocks.findUnique.mockResolvedValue({ id: "o1", perfil: "ORGANIZADOR", ativo: true, senhaHash: "argon-hash" });
    await expect(loginAction(form())).rejects.toThrow("REDIRECT:/organizador");
  });

  it("usa a mesma mensagem genérica para senha incorreta, conta ausente ou inativa", async () => {
    mocks.findUnique.mockResolvedValue({ id: "p1", perfil: "PARTICIPANTE", ativo: true, senhaHash: "argon-hash" });
    mocks.verify.mockResolvedValue(false);
    await expect(loginAction(form())).rejects.toThrow("REDIRECT:/login?erro=invalid");
    mocks.findUnique.mockResolvedValue({ id: "p1", perfil: "PARTICIPANTE", ativo: false, senhaHash: "argon-hash" });
    mocks.verify.mockResolvedValue(true);
    await expect(loginAction(form())).rejects.toThrow("REDIRECT:/login?erro=invalid");
    mocks.findUnique.mockResolvedValue(null);
    await expect(loginAction(form())).rejects.toThrow("REDIRECT:/login?erro=invalid");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("bloqueia tentativa após o rate limit", async () => {
    mocks.rate.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 1000 });
    await expect(loginAction(form())).rejects.toThrow("REDIRECT:/login?erro=rate");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
