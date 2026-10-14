import { beforeEach, describe, expect, it } from "vitest";
import { alteracaoAtivoSchema, cadastroSchema, decisaoOrganizadorSchema, loginSchema, solicitacaoOrganizadorSchema } from "../../src/auth/schemas";
import { areaInicialDoPerfil, podeAcessarPerfil, podeDesativarUsuario } from "../../src/auth/policy";
import { clearRateLimitsForTests, consumeRateLimit } from "../../src/auth/rate-limit";
import { createSessionToken, hashSessionToken } from "../../src/auth/session-token";

describe("schemas de cadastro e login", () => {
  it("normaliza email e mantém solicitação separada do perfil", () => {
    const parsed = cadastroSchema.parse({ nome: "  Ana Silva ", email: " ANA@EXAMPLE.ORG ", senha: "senha-segura-123", confirmarSenha: "senha-segura-123", queroSerOrganizador: true });
    expect(parsed.email).toBe("ana@example.org");
    expect(parsed.queroSerOrganizador).toBe(true);
    expect(parsed).not.toHaveProperty("perfil");
  });

  it("rejeita senha curta ou confirmação divergente", () => {
    expect(cadastroSchema.safeParse({ nome: "Ana", email: "ana@example.org", senha: "curta", confirmarSenha: "curta", queroSerOrganizador: false }).success).toBe(false);
    expect(cadastroSchema.safeParse({ nome: "Ana", email: "ana@example.org", senha: "senha-segura-123", confirmarSenha: "senha-segura-456", queroSerOrganizador: false }).success).toBe(false);
  });

  it("normaliza o email de login e recusa email inválido", () => {
    expect(loginSchema.parse({ email: " TEST@EXAMPLE.ORG ", senha: "x" }).email).toBe("test@example.org");
    expect(loginSchema.safeParse({ email: "nao-e-email", senha: "x" }).success).toBe(false);
  });

  it("valida solicitação, decisão e estado de ativação no servidor", () => {
    expect(solicitacaoOrganizadorSchema.safeParse({ intent: "request" }).success).toBe(true);
    expect(decisaoOrganizadorSchema.safeParse({ solicitacaoId: "id-invalido" }).success).toBe(false);
    expect(alteracaoAtivoSchema.parse({ usuarioId: "00000000-0000-4000-8000-000000000001", ativo: "false" }).ativo).toBe(false);
    expect(alteracaoAtivoSchema.safeParse({ usuarioId: "00000000-0000-4000-8000-000000000001", ativo: "talvez" }).success).toBe(false);
  });
});

describe("política de autorização", () => {
  it("mapeia perfil para a própria área e limita acesso a papéis explícitos", () => {
    expect(areaInicialDoPerfil("PARTICIPANTE")).toBe("/participante");
    expect(areaInicialDoPerfil("ORGANIZADOR")).toBe("/organizador");
    expect(areaInicialDoPerfil("AVALIADOR")).toBe("/");
    expect(podeAcessarPerfil("PARTICIPANTE", ["ADMIN"])).toBe(false);
    expect(podeAcessarPerfil("ORGANIZADOR", ["ADMIN"])).toBe(false);
    expect(podeAcessarPerfil("ADMIN", ["ADMIN"])).toBe(true);
  });

  it("protege a própria conta e o último administrador ativo", () => {
    expect(podeDesativarUsuario({ atorId: "a", alvoId: "a", alvoAtivo: true, alvoEhAdmin: true, quantidadeAdminsAtivos: 2, ativoDesejado: false })).toBe(false);
    expect(podeDesativarUsuario({ atorId: "a", alvoId: "b", alvoAtivo: true, alvoEhAdmin: true, quantidadeAdminsAtivos: 1, ativoDesejado: false })).toBe(false);
    expect(podeDesativarUsuario({ atorId: "a", alvoId: "b", alvoAtivo: true, alvoEhAdmin: true, quantidadeAdminsAtivos: 2, ativoDesejado: false })).toBe(true);
  });
});

describe("tokens de sessão e rate limit", () => {
  beforeEach(() => clearRateLimitsForTests());

  it("gera token aleatório longo e persiste apenas hash não reversível", () => {
    const first = createSessionToken();
    const second = createSessionToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashSessionToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken(first)).not.toBe(first);
  });

  it("limita tentativas por chave e libera a chave após a janela", () => {
    const rule = { limit: 2, windowMs: 1_000 };
    expect(consumeRateLimit("login:test", rule, 100).allowed).toBe(true);
    expect(consumeRateLimit("login:test", rule, 101).allowed).toBe(true);
    expect(consumeRateLimit("login:test", rule, 102).allowed).toBe(false);
    expect(consumeRateLimit("login:test", rule, 1_101).allowed).toBe(true);
  });
});
