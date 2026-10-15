import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ModalidadeEvento, PerfilUsuario, PrismaClient, StatusEvento, StatusInscricao, StatusTrabalhoCientifico } from "@prisma/client";
import type { WorkActor } from "@backend/modules/scientific-works/work-service";
import type { StorageContentType, StorageObject, StorageService } from "@backend/lib/storage/storage-service";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) console.warn("Integração de trabalhos ignorada: configure TEST_DATABASE_URL para um banco MySQL exclusivo de testes.");
const db = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const integration = databaseUrl ? describe : describe.skip;
type Service = typeof import("@backend/modules/scientific-works/work-service");
let service: Service | null = null;
let userIds: string[] = [];
let eventIds: string[] = [];
let registrationIds: string[] = [];
let workIds: string[] = [];
const files = new Map<string, StorageObject>();
const storage: StorageService = {
  put: async (key: string, data: Buffer, contentType: StorageContentType) => { files.set(key, { data, contentType }); },
  get: async (key: string) => files.get(key) ?? null,
  delete: async (key: string) => { files.delete(key); },
};
const pdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n", "ascii");
function pdfFile() { return new File([pdfBuffer], "submissao.pdf", { type: "application/pdf" }); }

async function user(perfil: PerfilUsuario): Promise<WorkActor> {
  const created = await db!.usuario.create({ data: { nome: `Usuário ${randomUUID().slice(0, 8)}`, email: `${randomUUID()}@example.test`, senhaHash: "test-only", perfil } });
  userIds.push(created.id);
  return { id: created.id, perfil: created.perfil, ativo: true };
}

async function fixture() {
  const organizer = await user(PerfilUsuario.ORGANIZADOR);
  const participant = await user(PerfilUsuario.PARTICIPANTE);
  const reviewer = await user(PerfilUsuario.AVALIADOR);
  const outsider = await user(PerfilUsuario.PARTICIPANTE);
  const now = new Date();
  const event = await db!.evento.create({ data: {
    titulo: "Evento científico", descricao: "Evento de integração", modalidade: ModalidadeEvento.ONLINE, nicho: "Pesquisa",
    dataInicio: new Date(now.getTime() - 60_000), dataTermino: new Date(now.getTime() + 86_400_000),
    vagasTotais: 20, vagasRestantes: 18, cargaHoraria: 8, organizadorId: organizer.id, status: StatusEvento.PUBLICADO,
    aceitaSubmissaoTrabalhos: true, inicioSubmissaoTrabalhos: new Date(now.getTime() - 60_000), fimSubmissaoTrabalhos: new Date(now.getTime() + 3_600_000),
  } });
  eventIds.push(event.id);
  for (const actor of [participant, outsider]) {
    const registration = await db!.inscricao.create({ data: { participanteId: actor.id, eventoId: event.id, tokenIngresso: randomUUID(), status: StatusInscricao.ATIVA } });
    registrationIds.push(registration.id);
  }
  return { organizer, participant, reviewer, outsider, event };
}

async function submit(actor: WorkActor, eventId: string) {
  const work = await service!.submitScientificWork(actor, {
    eventoId: eventId, titulo: "Análise experimental", resumo: "Resumo de pesquisa com conteúdo suficiente para a validação de domínio.",
  }, pdfFile(), db!, storage);
  workIds.push(work.id);
  return work;
}

beforeAll(async () => {
  if (db) { await db.$connect(); service = await import("@backend/modules/scientific-works/work-service"); }
});

afterEach(async () => {
  if (!db) return;
  if (workIds.length) await db.avaliacaoTrabalho.deleteMany({ where: { trabalhoId: { in: workIds } } });
  if (workIds.length) await db.trabalhoCientifico.deleteMany({ where: { id: { in: workIds } } });
  if (registrationIds.length) await db.inscricao.deleteMany({ where: { id: { in: registrationIds } } });
  if (eventIds.length) await db.evento.deleteMany({ where: { id: { in: eventIds } } });
  if (userIds.length) await db.usuario.deleteMany({ where: { id: { in: userIds } } });
  userIds = []; eventIds = []; registrationIds = []; workIds = []; files.clear();
});

afterAll(async () => db?.$disconnect());

integration("submissão e avaliação de trabalhos científicos com MySQL", () => {
  it("aceita participante inscrito com PDF válido e protege ownership e download", async () => {
    const { organizer, participant, outsider, event } = await fixture();
    const work = await submit(participant, event.id);
    const stored = await db!.trabalhoCientifico.findUniqueOrThrow({ where: { id: work.id } });
    expect(stored).toMatchObject({ status: StatusTrabalhoCientifico.SUBMETIDO, autorId: participant.id, eventoId: event.id });
    expect(files.get(stored.arquivoPdf)?.data.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    await expect(service!.getOwnScientificWork(outsider, work.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service!.getScientificWorkFile(outsider, work.id, db!, storage)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service!.listEventScientificWorks(outsider, event.id, "TODOS", db!)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service!.listEventScientificWorks(organizer, event.id, "TODOS", db!)).resolves.toHaveLength(1);
  });

  it("recusa usuário fora de papel, janela encerrada, ausência de inscrição e arquivo inválido", async () => {
    const { participant, event } = await fixture();
    const inactive = { ...participant, ativo: false };
    await expect(submit(inactive, event.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const reviewer = await user(PerfilUsuario.AVALIADOR);
    await expect(submit(reviewer, event.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db!.inscricao.updateMany({ where: { participanteId: participant.id, eventoId: event.id }, data: { status: StatusInscricao.CANCELADA } });
    await expect(submit(participant, event.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const noEnrollment = await user(PerfilUsuario.PARTICIPANTE);
    await expect(submit(noEnrollment, event.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service!.submitScientificWork(participant, { eventoId: event.id, titulo: "Título científico válido", resumo: "Resumo de pesquisa com conteúdo suficiente para a validação de domínio." }, new File(["texto"], "artigo.pdf", { type: "application/pdf" }), db!, storage)).rejects.toMatchObject({ code: "INVALID_DATA" });
    await db!.evento.update({ where: { id: event.id }, data: { fimSubmissaoTrabalhos: new Date(Date.now() - 1_000) } });
    await db!.inscricao.updateMany({ where: { participanteId: participant.id, eventoId: event.id }, data: { status: StatusInscricao.ATIVA } });
    await expect(submit(participant, event.id)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("só organizador do evento atribui avaliador e avaliador designado pode avaliar uma vez", async () => {
    const { organizer, participant, reviewer, outsider, event } = await fixture();
    const work = await submit(participant, event.id);
    await expect(service!.assignScientificWorkReviewer(outsider, { trabalhoId: work.id, avaliadorId: reviewer.id }, db!)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const otherOrganizer = await user(PerfilUsuario.ORGANIZADOR);
    await expect(service!.assignScientificWorkReviewer(otherOrganizer, { trabalhoId: work.id, avaliadorId: reviewer.id }, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service!.assignScientificWorkReviewer(organizer, { trabalhoId: work.id, avaliadorId: outsider.id }, db!)).rejects.toMatchObject({ code: "INVALID_DATA" });
    await service!.assignScientificWorkReviewer(organizer, { trabalhoId: work.id, avaliadorId: reviewer.id }, db!);
    const anotherReviewer = await user(PerfilUsuario.AVALIADOR);
    await expect(service!.getAssignedScientificWork({ ...anotherReviewer, perfil: PerfilUsuario.AVALIADOR }, work.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service!.submitScientificWorkEvaluation(participant, { trabalhoId: work.id, resultado: "APROVADO", parecer: "Parecer devidamente preenchido para este teste." }, db!)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const result = await service!.submitScientificWorkEvaluation(reviewer, { trabalhoId: work.id, resultado: "APROVADO", parecer: "Parecer devidamente preenchido para este teste de avaliação." }, db!);
    expect(result.status).toBe(StatusTrabalhoCientifico.APROVADO);
    expect(await db!.trabalhoCientifico.findUniqueOrThrow({ where: { id: work.id }, select: { status: true } })).toEqual({ status: StatusTrabalhoCientifico.APROVADO });
    expect(await db!.avaliacaoTrabalho.count({ where: { trabalhoId: work.id, avaliadorId: reviewer.id } })).toBe(1);
    await expect(service!.submitScientificWorkEvaluation(reviewer, { trabalhoId: work.id, resultado: "REJEITADO", parecer: "Segunda avaliação que não pode ser criada." }, db!)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
