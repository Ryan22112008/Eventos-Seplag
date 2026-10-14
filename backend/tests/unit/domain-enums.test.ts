import { describe, expect, it } from "vitest";
import { isDomainEnumValue, modalidadeEvento, perfilUsuario, statusEvento } from "../../src/lib/domain-enums";
describe("validação dos enums de domínio", () => {
  it("aceita perfis definidos e rejeita valores arbitrários", () => {
    expect(isDomainEnumValue(perfilUsuario, "ADMIN")).toBe(true);
    expect(isDomainEnumValue(perfilUsuario, "SUPERADMIN")).toBe(false);
  });
  it("aceita modalidades e status de evento conhecidos", () => {
    expect(isDomainEnumValue(modalidadeEvento, "HIBRIDO")).toBe(true);
    expect(isDomainEnumValue(statusEvento, "PUBLICADO")).toBe(true);
    expect(isDomainEnumValue(statusEvento, "ATIVO")).toBe(false);
  });
});
