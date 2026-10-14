import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@backend/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { decideOrganizerRequest, setUserActive } from "../../src/auth/admin-service";

describe("operações administrativas", () => {
  beforeEach(() => mocks.transaction.mockReset());

  it("aprova uma única solicitação e registra decisor e data na mesma transação", async () => {
    const tx = {
      solicitacaoOrganizador: {
        findUnique: vi.fn().mockResolvedValue({ id: "request-1", usuarioId: "user-1", status: "PENDENTE" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      usuario: { update: vi.fn().mockResolvedValue({}) },
    };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx));
    expect(await decideOrganizerRequest({ solicitacaoId: "request-1", adminId: "admin-1", decisao: "aprovar" })).toBe("done");
    expect(tx.solicitacaoOrganizador.updateMany.mock.calls[0][0].data).toMatchObject({ status: "APROVADO", decididoPorId: "admin-1" });
    expect(tx.solicitacaoOrganizador.updateMany.mock.calls[0][0].data.decididoEm).toBeInstanceOf(Date);
    expect(tx.usuario.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { perfil: "ORGANIZADOR" } });
  });

  it("a segunda reivindicação concorrente não promove o usuário; rejeição mantém o perfil", async () => {
    const tx = {
      solicitacaoOrganizador: {
        findUnique: vi.fn().mockResolvedValue({ id: "request-1", usuarioId: "user-1", status: "PENDENTE" }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      }, usuario: { update: vi.fn() },
    };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx));
    expect(await decideOrganizerRequest({ solicitacaoId: "request-1", adminId: "admin-1", decisao: "aprovar" })).toBe("already_processed");
    expect(tx.usuario.update).not.toHaveBeenCalled();

    tx.solicitacaoOrganizador.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await decideOrganizerRequest({ solicitacaoId: "request-1", adminId: "admin-1", decisao: "rejeitar" })).toBe("done");
    expect(tx.solicitacaoOrganizador.updateMany.mock.calls[1][0].data.status).toBe("REJEITADO");
    expect(tx.usuario.update).not.toHaveBeenCalled();
  });

  it("desativação revoga sessões existentes e protege o próprio administrador", async () => {
    const tx = {
      usuario: { findUnique: vi.fn().mockResolvedValue({ id: "user-1", ativo: true, perfil: "PARTICIPANTE" }), update: vi.fn(), count: vi.fn().mockResolvedValue(2) },
      sessaoAutenticacao: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    };
    mocks.transaction.mockImplementation(async (work: (client: typeof tx) => unknown) => work(tx));
    expect(await setUserActive({ actorId: "admin-1", usuarioId: "user-1", ativo: false })).toBe("changed");
    expect(tx.sessaoAutenticacao.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: "user-1" } });

    tx.usuario.findUnique.mockResolvedValue({ id: "admin-1", ativo: true, perfil: "ADMIN" });
    expect(await setUserActive({ actorId: "admin-1", usuarioId: "admin-1", ativo: false })).toBe("self_protected");
  });
});
