import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn(),
  get: vi.fn(), set: vi.fn(), deleteCookie: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@backend/lib/prisma", () => ({ prisma: { sessaoAutenticacao: { create: mocks.create, findUnique: mocks.findUnique, deleteMany: mocks.deleteMany } } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get, set: mocks.set, delete: mocks.deleteCookie }) }));

import { createSession, destroyCurrentSession, getCurrentUser, SESSION_COOKIE } from "../../src/auth/session";
import { hashSessionToken } from "../../src/auth/session-token";

describe("sessões persistidas", () => {
  beforeEach(() => {
    mocks.create.mockReset(); mocks.findUnique.mockReset(); mocks.deleteMany.mockReset();
    mocks.get.mockReset(); mocks.set.mockReset(); mocks.deleteCookie.mockReset();
  });

  it("armazena somente hash e define cookie seguro com expiração", async () => {
    await createSession("user-1");
    const token = mocks.set.mock.calls[0][1];
    expect(token).toHaveLength(43);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ usuarioId: "user-1", tokenHash: hashSessionToken(token) });
    expect(mocks.create.mock.calls[0][0].data.tokenHash).not.toBe(token);
    expect(mocks.set.mock.calls[0][0]).toBe(SESSION_COOKIE);
    expect(mocks.set.mock.calls[0][2]).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800 });
  });

  it("recupera somente usuário ativo e invalida sessão inativa", async () => {
    mocks.get.mockReturnValue({ value: "cookie-token" });
    mocks.findUnique.mockResolvedValue({ id: "session-1", expiresAt: new Date(Date.now() + 60_000), usuario: { id: "u1", ativo: false } });
    expect(await getCurrentUser()).toBeNull();
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash: hashSessionToken("cookie-token") } }));
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "session-1" } });
  });

  it("logout revoga o registro e remove o cookie", async () => {
    mocks.get.mockReturnValue({ value: "cookie-token" });
    await destroyCurrentSession();
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { tokenHash: hashSessionToken("cookie-token") } });
    expect(mocks.deleteCookie).toHaveBeenCalledWith(SESSION_COOKIE);
  });
});
