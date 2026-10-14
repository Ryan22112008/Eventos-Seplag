import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@backend/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { verify } from "argon2";
import { registerAccount, requestOrganizerRole } from "../../src/auth/account-service";

describe("serviço de cadastro e solicitação de organizador", () => {
  beforeEach(() => mocks.transaction.mockReset());

  it("sempre cria participante e armazena hash Argon2, não a senha", async () => {
    const userCreate = vi.fn().mockResolvedValue({ id: "user-1", nome: "Ana", email: "ana@example.org", perfil: "PARTICIPANTE" });
    const requestCreate = vi.fn();
    const tx = { usuario: { create: userCreate }, solicitacaoOrganizador: { create: requestCreate } };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx));

    await registerAccount({ nome: "Ana", email: "ana@example.org", senha: "senha-segura-123", confirmarSenha: "senha-segura-123", queroSerOrganizador: false });
    const data = userCreate.mock.calls[0][0].data;
    expect(data.perfil).toBe("PARTICIPANTE");
    expect(data.senhaHash).not.toBe("senha-segura-123");
    expect(await verify(data.senhaHash, "senha-segura-123")).toBe(true);
    expect(requestCreate).not.toHaveBeenCalled();
  });

  it("cria solicitação pendente quando o checkbox é marcado sem promover o usuário", async () => {
    const userCreate = vi.fn().mockResolvedValue({ id: "user-2", perfil: "PARTICIPANTE" });
    const requestCreate = vi.fn().mockResolvedValue({});
    const tx = { usuario: { create: userCreate }, solicitacaoOrganizador: { create: requestCreate } };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx));

    await registerAccount({ nome: "Bia", email: "bia@example.org", senha: "senha-segura-123", confirmarSenha: "senha-segura-123", queroSerOrganizador: true });
    expect(userCreate.mock.calls[0][0].data.perfil).toBe("PARTICIPANTE");
    expect(requestCreate.mock.calls[0][0].data).toMatchObject({ usuarioId: "user-2", status: "PENDENTE" });
  });

  it("não cria segunda solicitação se já houver uma pendente", async () => {
    const create = vi.fn();
    const tx = {
      usuario: { findUnique: vi.fn().mockResolvedValue({ perfil: "PARTICIPANTE", ativo: true }) },
      solicitacaoOrganizador: { findFirst: vi.fn().mockResolvedValue({ id: "pending-1" }), create },
    };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx));
    expect(await requestOrganizerRole("user-1")).toBe("pending");
    expect(create).not.toHaveBeenCalled();
  });

  it("permite nova solicitação após rejeição e bloqueia usuário já promovido", async () => {
    const create = vi.fn().mockResolvedValue({});
    const tx = {
      usuario: { findUnique: vi.fn().mockResolvedValue({ perfil: "PARTICIPANTE", ativo: true }) },
      solicitacaoOrganizador: {
        findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ status: "REJEITADO" }), create,
      },
    };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx));
    expect(await requestOrganizerRole("user-1")).toBe("created");
    expect(create).toHaveBeenCalledOnce();

    const promotedTx = { usuario: { findUnique: vi.fn().mockResolvedValue({ perfil: "ORGANIZADOR", ativo: true }) }, solicitacaoOrganizador: { findFirst: vi.fn(), create } };
    mocks.transaction.mockImplementation(async (work: (client: typeof promotedTx) => unknown) => work(promotedTx));
    expect(await requestOrganizerRole("user-1")).toBe("not_participant");
  });
});
