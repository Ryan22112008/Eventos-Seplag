import { describe, expect, it } from "vitest";
import { validateEnvironment } from "../../src/lib/environment";

describe("validação da configuração básica do ambiente", () => {
  it("aceita configuração sem segredos durante validações locais", () => {
    expect(validateEnvironment({ BASE_URL: "http://localhost:3000" })).toEqual({ BASE_URL: "http://localhost:3000" });
  });

  it("rejeita URL base malformada", () => {
    expect(() => validateEnvironment({ BASE_URL: "nao-e-url" })).toThrow();
  });

  it("valida a URL pública e a opção de conexão SMTP", () => {
    expect(validateEnvironment({ APP_URL: "https://eventos.example.org", SMTP_PORT: "465", SMTP_SECURE: "true" })).toMatchObject({ APP_URL: "https://eventos.example.org", SMTP_PORT: "465", SMTP_SECURE: "true" });
    expect(() => validateEnvironment({ SMTP_SECURE: "sim" })).toThrow();
  });
});
