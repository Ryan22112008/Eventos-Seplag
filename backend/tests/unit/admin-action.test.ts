import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(), decide: vi.fn(), setActive: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
}));
vi.mock("@backend/auth/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@backend/auth/admin-service", () => ({ decideOrganizerRequest: mocks.decide, setUserActive: mocks.setActive }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { approveOrganizerAction, setUserActiveAction } from "../../src/server/actions/admin";

describe("autorização e validação das ações administrativas", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset(); mocks.decide.mockReset(); mocks.setActive.mockReset(); mocks.redirect.mockClear();
  });

  it("não processa aprovação quando a sessão não tem papel ADMIN", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("REDIRECT:/participante"));
    const form = new FormData(); form.set("solicitacaoId", "00000000-0000-4000-8000-000000000001");
    await expect(approveOrganizerAction(form)).rejects.toThrow("REDIRECT:/participante");
    expect(mocks.decide).not.toHaveBeenCalled();
  });

  it("obtém o ADMIN autenticado no servidor em vez de aceitar identidade do formulário", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-from-session" });
    mocks.decide.mockResolvedValue("done");
    const form = new FormData(); form.set("solicitacaoId", "00000000-0000-4000-8000-000000000001"); form.set("adminId", "attacker-id");
    await expect(approveOrganizerAction(form)).rejects.toThrow("REDIRECT:/admin/solicitacoes-organizador?resultado=done");
    expect(mocks.decide).toHaveBeenCalledWith(expect.objectContaining({ adminId: "admin-from-session" }));
  });

  it("recusa valores de ativação fora dos estados permitidos", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
    const form = new FormData(); form.set("usuarioId", "00000000-0000-4000-8000-000000000001"); form.set("ativo", "surpresa");
    await expect(setUserActiveAction(form)).rejects.toThrow("REDIRECT:/admin/usuarios?resultado=invalid");
    expect(mocks.setActive).not.toHaveBeenCalled();
  });
});
