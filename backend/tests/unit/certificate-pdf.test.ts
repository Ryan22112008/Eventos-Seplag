import { describe, expect, it } from "vitest";
import { buildCertificateValidationUrl, CertificateConfigurationError, getCertificateSettings, renderCertificatePdf } from "@backend/modules/certificates/certificate-pdf";

describe("certificados PDF", () => {
  it("usa somente a base configurada e o código público na URL do QR", () => {
    expect(buildCertificateValidationUrl("https://eventos.example/", "123e4567-e89b-42d3-a456-426614174000"))
      .toBe("https://eventos.example/certificados/validar/123e4567-e89b-42d3-a456-426614174000");
  });

  it("exige nome e texto institucionais configurados, sem valores oficiais fixos", async () => {
    await expect(getCertificateSettings({ BASE_URL: "http://localhost:3000" })).rejects.toBeInstanceOf(CertificateConfigurationError);
    await expect(getCertificateSettings({
      BASE_URL: "http://localhost:3000/", CERTIFICATE_INSTITUTION_NAME: "Instituição de teste",
      CERTIFICATE_TEXT: "Texto de teste", CERTIFICATE_LOGO_PATH: "",
    })).resolves.toMatchObject({ institutionName: "Instituição de teste", institutionalText: "Texto de teste", baseUrl: "http://localhost:3000" });
  });

  it("gera PDF com QR de validação e metadados a partir dos dados fornecidos", async () => {
    const pdf = await renderCertificatePdf({
      institutionName: "Instituição de teste", institutionalText: "Certificamos {{participante}} pela participação em {{evento}}.",
      baseUrl: "https://eventos.example", participantName: "João da Silva", eventTitle: "Curso de teste",
      eventStart: new Date("2026-10-01T12:00:00Z"), eventEnd: new Date("2026-10-01T20:00:00Z"), workloadHours: "8.00",
      issuedAt: new Date("2026-10-02T12:00:00Z"), code: "123e4567-e89b-42d3-a456-426614174000",
    });
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.includes(Buffer.from("Certificado"))).toBe(true);
  });
});
