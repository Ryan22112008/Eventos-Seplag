import { describe, expect, it } from "vitest";
import { eventInputSchema } from "@backend/modules/events/event.schemas";
import { evaluationSchema, reviewerAssignmentSchema, workSubmissionSchema } from "@backend/modules/scientific-works/work.schemas";
import { MAX_SCIENTIFIC_WORK_BYTES, validateScientificPdf } from "@backend/modules/scientific-works/validate-scientific-pdf";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const validEvent = {
  titulo: "Evento de ciência", descricao: "Descrição do evento", dataInicio: "2030-01-01T10:00:00.000Z", dataTermino: "2030-01-02T10:00:00.000Z",
  local: null, cidade: null, urlGoogleMaps: "", latitude: null, longitude: null, modalidade: "PRESENCIAL", nicho: "Ciência",
  vagasTotais: "20", cargaHoraria: "8", percentualMinimoPresenca: "75", aceitaSubmissaoTrabalhos: true,
  inicioSubmissaoTrabalhos: "2029-12-01T10:00:00.000Z", fimSubmissaoTrabalhos: "2029-12-20T10:00:00.000Z",
};

describe("validações de trabalhos científicos", () => {
  it("exige um intervalo válido quando o evento aceita submissões", () => {
    expect(eventInputSchema.safeParse({ ...validEvent, fimSubmissaoTrabalhos: "" }).success).toBe(false);
    expect(eventInputSchema.safeParse(validEvent).success).toBe(true);
    expect(eventInputSchema.safeParse({ ...validEvent, inicioSubmissaoTrabalhos: "2029-12-20T10:00:00.000Z" }).success).toBe(false);
  });

  it("valida submissão, atribuição e parecer", () => {
    expect(workSubmissionSchema.safeParse({ eventoId: uuid, titulo: "Estudo de validação", resumo: "Resumo suficientemente longo para cumprir o limite mínimo exigido." }).success).toBe(true);
    expect(workSubmissionSchema.safeParse({ eventoId: "x", titulo: "Oi", resumo: "curto" }).success).toBe(false);
    expect(reviewerAssignmentSchema.safeParse({ trabalhoId: uuid, avaliadorId: uuid }).success).toBe(true);
    expect(evaluationSchema.safeParse({ trabalhoId: uuid, resultado: "APROVADO", parecer: "Parecer detalhado com justificativa suficiente." }).success).toBe(true);
    expect(evaluationSchema.safeParse({ trabalhoId: uuid, resultado: "EM_AVALIACAO", parecer: "curto" }).success).toBe(false);
  });

  it("aceita PDF com cabeçalho e encerramento válidos, rejeitando MIME, extensão, assinatura e tamanho incorretos", () => {
    const data = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n", "ascii");
    expect(() => validateScientificPdf({ name: "artigo.pdf", declaredType: "application/pdf", data })).not.toThrow();
    expect(() => validateScientificPdf({ name: "artigo.txt", declaredType: "application/pdf", data })).toThrow("INVALID_WORK_FILE_EXTENSION");
    expect(() => validateScientificPdf({ name: "artigo.pdf", declaredType: "text/plain", data })).toThrow("INVALID_WORK_FILE_MIME");
    expect(() => validateScientificPdf({ name: "artigo.pdf", declaredType: "application/pdf", data: Buffer.from("não é pdf") })).toThrow("INVALID_WORK_FILE_SIGNATURE");
    expect(() => validateScientificPdf({ name: "artigo.pdf", declaredType: "application/pdf", data, maxBytes: data.byteLength - 1 })).toThrow("INVALID_WORK_FILE_SIZE");
    expect(MAX_SCIENTIFIC_WORK_BYTES).toBe(10 * 1024 * 1024);
  });
});
