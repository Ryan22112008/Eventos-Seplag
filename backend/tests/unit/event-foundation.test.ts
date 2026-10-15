import { describe, expect, it } from "vitest";
import { eventInputSchema, sessaoInputSchema } from "@backend/modules/events/event.schemas";
import { canManageEvent, canManageEvents, canTransitionEvent, isSessionWithinEvent } from "@backend/modules/events/event-policy";
import { detectAndValidateEventImage, MAX_EVENT_IMAGE_BYTES } from "@backend/lib/storage/validate-image";
import { isValidPrivateStorageKey, resolvePrivateStorageKey } from "@backend/lib/storage/storage-key";
import { replaceStoredObjectReference } from "@backend/lib/storage/replace-object-reference";
import { calculateEventRates } from "@backend/modules/events/event-metrics";
import type { StorageService } from "@backend/lib/storage/storage-service";

const validEvent = {
  titulo: "Congresso de Saúde",
  descricao: "Evento institucional de formação.",
  dataInicio: "2030-05-01T09:00",
  dataTermino: "2030-05-01T18:00",
  local: "Centro de convenções",
  cidade: "Cuiabá",
  urlGoogleMaps: "https://maps.google.com/?q=Cuiaba",
  latitude: "-15.601",
  longitude: "-56.097",
  modalidade: "PRESENCIAL",
  nicho: "Saúde",
  vagasTotais: "0",
  cargaHoraria: "8",
  percentualMinimoPresenca: "75",
  aceitaSubmissaoTrabalhos: false,
};

describe("fundação do domínio de eventos", () => {
  it("calcula taxas com denominadores documentados e evita divisão por zero", () => {
    expect(calculateEventRates(25, 100, 20, 40)).toEqual({ occupancyRate: 25, attendanceRate: 50 });
    expect(calculateEventRates(0, 0, 0, 0)).toEqual({ occupancyRate: null, attendanceRate: null });
  });
  it("valida os dados básicos e transforma datas/números", () => {
    const result = eventInputSchema.parse(validEvent);
    expect(result.dataInicio).toBeInstanceOf(Date);
    expect(result.vagasTotais).toBe(0);
  });

  it("rejeita término anterior ao início, vagas negativas e URLs não HTTP", () => {
    expect(eventInputSchema.safeParse({ ...validEvent, dataTermino: "2030-04-01T09:00" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...validEvent, vagasTotais: "-1" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...validEvent, percentualMinimoPresenca: "" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...validEvent, urlGoogleMaps: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejeita sessão com fim anterior ao início", () => {
    expect(sessaoInputSchema.safeParse({ nome: "Abertura", inicio: "2030-05-01T10:00", fim: "2030-05-01T09:00" }).success).toBe(false);
    expect(isSessionWithinEvent({ inicio: new Date("2030-05-01T08:00Z"), fim: new Date("2030-05-01T09:00Z") }, { dataInicio: new Date("2030-05-01T10:00Z"), dataTermino: new Date("2030-05-01T18:00Z") })).toBe(false);
  });

  it("restringe organizadores ao próprio evento e permite ADMIN", () => {
    const orgA = { id: "org-a", perfil: "ORGANIZADOR" as const, ativo: true };
    expect(canManageEvents({ id: "p", perfil: "PARTICIPANTE", ativo: true })).toBe(false);
    expect(canManageEvent(orgA, "org-a")).toBe(true);
    expect(canManageEvent(orgA, "org-b")).toBe(false);
    expect(canManageEvent({ id: "admin", perfil: "ADMIN", ativo: true }, "org-b")).toBe(true);
    expect(canManageEvents({ id: "admin", perfil: "ADMIN", ativo: false })).toBe(false);
  });

  it("permite somente as transições de status definidas", () => {
    expect(canTransitionEvent("RASCUNHO", "PUBLICADO")).toBe(true);
    expect(canTransitionEvent("RASCUNHO", "CANCELADO")).toBe(true);
    expect(canTransitionEvent("PUBLICADO", "ENCERRADO")).toBe(true);
    expect(canTransitionEvent("CANCELADO", "PUBLICADO")).toBe(false);
    expect(canTransitionEvent("ENCERRADO", "CANCELADO")).toBe(false);
  });

  it("reconhece assinatura PNG e JPEG, mas rejeita extensão falsa, SVG e excesso de tamanho", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]);
    expect(detectAndValidateEventImage({ name: "imagem.png", declaredType: "image/png", data: png }).contentType).toBe("image/png");
    expect(detectAndValidateEventImage({ name: "imagem.jpeg", declaredType: "image/jpeg", data: jpg }).extension).toBe("jpg");
    expect(() => detectAndValidateEventImage({ name: "imagem.jpg", declaredType: "image/jpeg", data: png })).toThrow("IMAGE_EXTENSION_MISMATCH");
    expect(() => detectAndValidateEventImage({ name: "imagem.svg", declaredType: "image/svg+xml", data: Buffer.from("<svg/>") })).toThrow("INVALID_IMAGE_FORMAT");
    expect(() => detectAndValidateEventImage({ name: "grande.png", declaredType: "image/png", data: Buffer.alloc(MAX_EVENT_IMAGE_BYTES + 1) })).toThrow("INVALID_IMAGE_SIZE");
  });

  it("não aceita chaves de storage com path traversal ou arquivo nomeado pelo cliente", () => {
    const good = "123e4567-e89b-42d3-a456-426614174000/assets/banner/123e4567-e89b-42d3-a456-426614174001.png";
    const certificate = "123e4567-e89b-42d3-a456-426614174000/certificados/123e4567-e89b-42d3-a456-426614174001/123e4567-e89b-42d3-a456-426614174002.pdf";
    const scientificWork = "123e4567-e89b-42d3-a456-426614174000/trabalhos/123e4567-e89b-42d3-a456-426614174001/123e4567-e89b-42d3-a456-426614174002.pdf";
    expect(isValidPrivateStorageKey(good)).toBe(true);
    expect(isValidPrivateStorageKey(certificate)).toBe(true);
    expect(isValidPrivateStorageKey(scientificWork)).toBe(true);
    expect(isValidPrivateStorageKey("../../secret.png")).toBe(false);
    expect(isValidPrivateStorageKey("123e4567-e89b-42d3-a456-426614174000/certificados/../certificate.pdf")).toBe(false);
    expect(isValidPrivateStorageKey("123e4567-e89b-42d3-a456-426614174000/assets/banner/../../secret.png")).toBe(false);
    expect(resolvePrivateStorageKey("C:/private", good)).toContain("private");
    expect(() => resolvePrivateStorageKey("C:/private", "../../secret.png")).toThrow("Invalid private storage key");
  });

  it("salva nova imagem antes da troca de referência e preserva referência antiga se a atualização falhar", async () => {
    const calls: string[] = [];
    const storage: StorageService = {
      put: async (key) => { calls.push(`put:${key}`); },
      get: async () => null,
      delete: async (key) => { calls.push(`delete:${key}`); },
    };
    await expect(replaceStoredObjectReference({
      storage, newKey: "new-object", oldKey: "old-object", data: Buffer.from("new"), contentType: "image/png",
      updateReference: async () => { calls.push("update"); return false; }, logCleanupFailure: () => undefined,
    })).rejects.toThrow("REFERENCE_NOT_UPDATED");
    expect(calls).toEqual(["put:new-object", "update", "delete:new-object"]);
    expect(calls).not.toContain("delete:old-object");
  });
});
