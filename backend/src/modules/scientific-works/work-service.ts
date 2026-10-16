import "server-only";
import { randomUUID } from "node:crypto";
import { PerfilUsuario, Prisma, PrismaClient, StatusEvento, StatusInscricao, StatusTrabalhoCientifico } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { DomainError } from "@backend/lib/errors";
import { canManageEvent } from "@backend/modules/events/event-policy";
import { getStorageService } from "@backend/lib/storage/local-storage-service";
import type { StorageService } from "@backend/lib/storage/storage-service";
import { evaluationSchema, reviewerAssignmentSchema, workIdSchema, workStatusFilterSchema, workSubmissionSchema } from "./work.schemas";
import { MAX_SCIENTIFIC_WORK_BYTES, validateScientificPdf } from "./validate-scientific-pdf";

export type WorkActor = { id: string; perfil: PerfilUsuario; ativo: boolean };
export type WorkStatus = "SUBMETIDO" | "EM_AVALIACAO" | "APROVADO" | "REJEITADO";
export type SubmissionEventOption = { id: string; titulo: string; dataInicio: Date; inicioSubmissaoTrabalhos: Date | null; fimSubmissaoTrabalhos: Date | null };
export type ParticipantWorkListItem = { id: string; titulo: string; status: WorkStatus; createdAt: Date; evento: { id: string; titulo: string }; avaliacao: { resultado: "APROVADO" | "REJEITADO"; parecer: string; avaliadoEm: Date } | null };
export type ReviewerWorkListItem = { id: string; titulo: string; status: WorkStatus; createdAt: Date; evento: { titulo: string }; avaliacao: { resultado: "APROVADO" | "REJEITADO"; parecer: string; avaliadoEm: Date } | null };
export type OrganizerWorkListItem = { id: string; titulo: string; resumo: string; status: WorkStatus; createdAt: Date; autor: { id: string; nome: string; email: string }; avaliador: { id: string; nome: string } | null; avaliacao: { resultado: "APROVADO" | "REJEITADO"; parecer: string; avaliadoEm: Date; avaliador: { nome: string } } | null };
export type ReviewerOption = { id: string; nome: string };

function requireActiveRole(actor: WorkActor, role: PerfilUsuario) {
  if (!actor.ativo || actor.perfil !== role) throw new DomainError("FORBIDDEN", "Acesso negado.");
}

async function readAndValidatePdf(file: File): Promise<Buffer> {
  if (!(file instanceof File) || file.size <= 0 || file.size > MAX_SCIENTIFIC_WORK_BYTES) throw new DomainError("INVALID_DATA", "Envie um arquivo PDF de até 10 MB.");
  const data = Buffer.from(await file.arrayBuffer());
  try { validateScientificPdf({ name: file.name, declaredType: file.type, data }); }
  catch { throw new DomainError("INVALID_DATA", "Arquivo inválido. Envie um PDF válido de até 10 MB."); }
  return data;
}

export async function listAvailableSubmissionEvents(actor: WorkActor, client: PrismaClient = prisma) {
  requireActiveRole(actor, PerfilUsuario.PARTICIPANTE);
  const [{ now }] = await client.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP(3) AS \`now\``;
  const registrations = await client.inscricao.findMany({
    where: { participanteId: actor.id, status: StatusInscricao.ATIVA, evento: {
      aceitaSubmissaoTrabalhos: true, status: StatusEvento.PUBLICADO,
      inicioSubmissaoTrabalhos: { lte: now }, fimSubmissaoTrabalhos: { gt: now },
    } },
    orderBy: { evento: { inicioSubmissaoTrabalhos: "asc" } },
    select: { evento: { select: { id: true, titulo: true, dataInicio: true, inicioSubmissaoTrabalhos: true, fimSubmissaoTrabalhos: true } } },
  }) as Array<{ evento: SubmissionEventOption }>;
  return registrations.map(({ evento }: { evento: SubmissionEventOption }) => evento);
}

export async function submitScientificWork(actor: WorkActor, rawInput: unknown, file: File, client: PrismaClient = prisma, storage: StorageService = getStorageService()) {
  requireActiveRole(actor, PerfilUsuario.PARTICIPANTE);
  const input = workSubmissionSchema.parse(rawInput);
  const data = await readAndValidatePdf(file);
  const workId = randomUUID();
  const fileKey = `${input.eventoId}/trabalhos/${workId}/${randomUUID()}.pdf`;
  let fileWritten = false;
  try {
    return await client.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ id: string }>>`SELECT \`id\` FROM \`eventos\` WHERE \`id\` = ${input.eventoId} FOR UPDATE`;
      if (lock.length !== 1) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
      const event = await tx.evento.findUnique({ where: { id: input.eventoId }, select: {
        id: true, status: true, aceitaSubmissaoTrabalhos: true, inicioSubmissaoTrabalhos: true, fimSubmissaoTrabalhos: true,
      } });
      const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP(3) AS \`now\``;
      if (!event || event.status !== StatusEvento.PUBLICADO || !event.aceitaSubmissaoTrabalhos
        || !event.inicioSubmissaoTrabalhos || !event.fimSubmissaoTrabalhos
        || event.inicioSubmissaoTrabalhos > now || event.fimSubmissaoTrabalhos <= now) {
        throw new DomainError("INVALID_STATE", "O evento não está recebendo trabalhos neste momento.");
      }
      const registration = await tx.$queryRaw<Array<{ id: string }>>`SELECT \`id\` FROM \`inscricoes\` WHERE \`evento_id\` = ${event.id} AND \`participante_id\` = ${actor.id} AND \`status\` = 'ATIVA' FOR UPDATE`;
      if (registration.length !== 1) throw new DomainError("FORBIDDEN", "É necessária uma inscrição ativa para submeter trabalho.");
      fileWritten = true;
      await storage.put(fileKey, data, "application/pdf");
      return tx.trabalhoCientifico.create({ data: {
        id: workId, titulo: input.titulo, resumo: input.resumo, arquivoPdf: fileKey,
        eventoId: event.id, autorId: actor.id, status: StatusTrabalhoCientifico.SUBMETIDO,
      }, select: { id: true, titulo: true, status: true, createdAt: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });
  } catch (error) {
    if (fileWritten) {
      try {
        const committed = await client.trabalhoCientifico.findFirst({ where: { arquivoPdf: fileKey }, select: { id: true } });
        if (!committed) await storage.delete(fileKey);
      } catch (cleanupError) { console.error("Falha ao verificar ou remover arquivo de submissão sem referência.", cleanupError); }
    }
    throw error;
  }
}

export async function listOwnScientificWorks(actor: WorkActor, client: PrismaClient = prisma) {
  requireActiveRole(actor, PerfilUsuario.PARTICIPANTE);
  return client.trabalhoCientifico.findMany({
    where: { autorId: actor.id }, orderBy: { createdAt: "desc" },
    select: { id: true, titulo: true, status: true, createdAt: true, evento: { select: { id: true, titulo: true } }, avaliacao: { select: { resultado: true, parecer: true, avaliadoEm: true } } },
  });
}

export async function getOwnScientificWork(actor: WorkActor, workId: string, client: PrismaClient = prisma) {
  requireActiveRole(actor, PerfilUsuario.PARTICIPANTE);
  const parsed = workIdSchema.safeParse(workId);
  if (!parsed.success) throw new DomainError("NOT_FOUND", "Trabalho não encontrado.");
  const work = await client.trabalhoCientifico.findFirst({ where: { id: parsed.data, autorId: actor.id }, select: {
    id: true, titulo: true, resumo: true, status: true, createdAt: true,
    evento: { select: { id: true, titulo: true } }, avaliacao: { select: { resultado: true, parecer: true, avaliadoEm: true } },
  } });
  if (!work) throw new DomainError("NOT_FOUND", "Trabalho não encontrado.");
  return work;
}

export async function listEventScientificWorks(actor: WorkActor, eventId: string, rawStatus: unknown = "TODOS", client: PrismaClient = prisma) {
  if (!actor.ativo || (actor.perfil !== PerfilUsuario.ORGANIZADOR && actor.perfil !== PerfilUsuario.ADMIN)) throw new DomainError("FORBIDDEN", "Acesso negado.");
  const filter = workStatusFilterSchema.parse(rawStatus);
  const parsedEventId = workIdSchema.safeParse(eventId);
  if (!parsedEventId.success) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
  const event = await client.evento.findUnique({ where: { id: parsedEventId.data }, select: { id: true, organizadorId: true } });
  if (!event || !canManageEvent(actor, event.organizadorId)) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
  return client.trabalhoCientifico.findMany({
    where: { eventoId: event.id, ...(filter === "TODOS" ? {} : { status: filter as StatusTrabalhoCientifico }) },
    orderBy: { createdAt: "desc" },
    select: { id: true, titulo: true, resumo: true, status: true, createdAt: true,
      autor: { select: { id: true, nome: true, email: true } }, avaliador: { select: { id: true, nome: true } },
      avaliacao: { select: { resultado: true, parecer: true, avaliadoEm: true, avaliador: { select: { nome: true } } } },
    },
  });
}

export async function listActiveReviewers(actor: WorkActor, eventId: string, client: PrismaClient = prisma) {
  if (!actor.ativo || (actor.perfil !== PerfilUsuario.ORGANIZADOR && actor.perfil !== PerfilUsuario.ADMIN)) throw new DomainError("FORBIDDEN", "Acesso negado.");
  const parsed = workIdSchema.safeParse(eventId);
  if (!parsed.success) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
  const event = await client.evento.findUnique({ where: { id: parsed.data }, select: { organizadorId: true } });
  if (!event || !canManageEvent(actor, event.organizadorId)) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
  return client.usuario.findMany({ where: { perfil: PerfilUsuario.AVALIADOR, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } });
}

export async function assignScientificWorkReviewer(actor: WorkActor, rawInput: unknown, client: PrismaClient = prisma) {
  if (!actor.ativo || (actor.perfil !== PerfilUsuario.ORGANIZADOR && actor.perfil !== PerfilUsuario.ADMIN)) throw new DomainError("FORBIDDEN", "Acesso negado.");
  const input = reviewerAssignmentSchema.parse(rawInput);
  return client.$transaction(async (tx) => {
    const lock = await tx.$queryRaw<Array<{ id: string }>>`SELECT \`id\` FROM \`trabalhos_cientificos\` WHERE \`id\` = ${input.trabalhoId} FOR UPDATE`;
    if (lock.length !== 1) throw new DomainError("NOT_FOUND", "Trabalho não encontrado.");
    const work = await tx.trabalhoCientifico.findUnique({ where: { id: input.trabalhoId }, select: {
      id: true, eventoId: true, status: true, avaliadorId: true,
      evento: { select: { organizadorId: true } }, avaliacao: { select: { id: true } },
    } });
    if (!work || !canManageEvent(actor, work.evento.organizadorId)) throw new DomainError("NOT_FOUND", "Trabalho não encontrado.");
    if (work.avaliacao || (work.status !== StatusTrabalhoCientifico.SUBMETIDO && work.status !== StatusTrabalhoCientifico.EM_AVALIACAO)) throw new DomainError("INVALID_STATE", "Este trabalho não pode receber atribuição.");
    const reviewer = await tx.usuario.findFirst({ where: { id: input.avaliadorId, perfil: PerfilUsuario.AVALIADOR, ativo: true }, select: { id: true } });
    if (!reviewer) throw new DomainError("INVALID_DATA", "Selecione um avaliador ativo.");
    if (work.avaliadorId && work.avaliadorId !== reviewer.id) throw new DomainError("CONFLICT", "Este trabalho já está atribuído a outro avaliador.");
    const changed = await tx.trabalhoCientifico.updateMany({
      where: { id: work.id, status: { in: [StatusTrabalhoCientifico.SUBMETIDO, StatusTrabalhoCientifico.EM_AVALIACAO] }, avaliadorId: work.avaliadorId },
      data: { avaliadorId: reviewer.id, status: StatusTrabalhoCientifico.EM_AVALIACAO },
    });
    if (changed.count !== 1) throw new DomainError("CONFLICT", "O trabalho foi alterado. Atualize a página.");
    return { trabalhoId: work.id, eventoId: work.eventoId, avaliadorId: reviewer.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listAssignedScientificWorks(actor: WorkActor, client: PrismaClient = prisma) {
  requireActiveRole(actor, PerfilUsuario.AVALIADOR);
  return client.trabalhoCientifico.findMany({ where: { avaliadorId: actor.id }, orderBy: { updatedAt: "desc" }, select: {
    id: true, titulo: true, status: true, createdAt: true, evento: { select: { titulo: true } },
    avaliacao: { select: { resultado: true, parecer: true, avaliadoEm: true } },
  } });
}

export async function getAssignedScientificWork(actor: WorkActor, workId: string, client: PrismaClient = prisma) {
  requireActiveRole(actor, PerfilUsuario.AVALIADOR);
  const parsed = workIdSchema.safeParse(workId);
  if (!parsed.success) throw new DomainError("NOT_FOUND", "Trabalho não encontrado.");
  const work = await client.trabalhoCientifico.findFirst({ where: { id: parsed.data, avaliadorId: actor.id }, select: {
    id: true, titulo: true, resumo: true, status: true, avaliacao: { select: { resultado: true, parecer: true, avaliadoEm: true } }, evento: { select: { titulo: true } },
  } });
  if (!work) throw new DomainError("NOT_FOUND", "Trabalho não encontrado.");
  return work;
}

export async function submitScientificWorkEvaluation(actor: WorkActor, rawInput: unknown, client: PrismaClient = prisma) {
  requireActiveRole(actor, PerfilUsuario.AVALIADOR);
  const input = evaluationSchema.parse(rawInput);
  return client.$transaction(async (tx) => {
    const lock = await tx.$queryRaw<Array<{ id: string }>>`SELECT \`id\` FROM \`trabalhos_cientificos\` WHERE \`id\` = ${input.trabalhoId} FOR UPDATE`;
    if (lock.length !== 1) throw new DomainError("NOT_FOUND", "Trabalho não encontrado.");
    const work = await tx.trabalhoCientifico.findFirst({ where: { id: input.trabalhoId, avaliadorId: actor.id }, select: { id: true, status: true, avaliacao: { select: { id: true } } } });
    if (!work) throw new DomainError("NOT_FOUND", "Trabalho não encontrado.");
    if (work.status !== StatusTrabalhoCientifico.EM_AVALIACAO || work.avaliacao) throw new DomainError("CONFLICT", "A avaliação já foi enviada ou o trabalho não está disponível.");
    const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP(3) AS \`now\``;
    await tx.avaliacaoTrabalho.create({ data: {
      id: randomUUID(), trabalhoId: work.id, avaliadorId: actor.id,
      resultado: input.resultado, parecer: input.parecer, avaliadoEm: now,
    } });
    const changed = await tx.trabalhoCientifico.updateMany({
      where: { id: work.id, avaliadorId: actor.id, status: StatusTrabalhoCientifico.EM_AVALIACAO },
      data: { status: input.resultado },
    });
    if (changed.count !== 1) throw new DomainError("CONFLICT", "O trabalho foi alterado durante a avaliação.");
    return { trabalhoId: work.id, status: input.resultado, avaliadoEm: now };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getScientificWorkFile(actor: WorkActor, workId: string, client: PrismaClient = prisma, storage: StorageService = getStorageService()) {
  if (!actor.ativo || ![PerfilUsuario.PARTICIPANTE, PerfilUsuario.ORGANIZADOR, PerfilUsuario.ADMIN, PerfilUsuario.AVALIADOR].includes(actor.perfil)) throw new DomainError("FORBIDDEN", "Acesso negado.");
  const parsed = workIdSchema.safeParse(workId);
  if (!parsed.success) throw new DomainError("NOT_FOUND", "Arquivo não encontrado.");
  const work = await client.trabalhoCientifico.findUnique({ where: { id: parsed.data }, select: {
    arquivoPdf: true, autorId: true, avaliadorId: true, evento: { select: { organizadorId: true } },
  } });
  if (!work) throw new DomainError("NOT_FOUND", "Arquivo não encontrado.");
  const owner = actor.perfil === PerfilUsuario.PARTICIPANTE && actor.id === work.autorId;
  const manager = canManageEvent(actor, work.evento.organizadorId);
  const reviewer = actor.perfil === PerfilUsuario.AVALIADOR && actor.id === work.avaliadorId;
  if (!owner && !manager && !reviewer) throw new DomainError("NOT_FOUND", "Arquivo não encontrado.");
  const object = await storage.get(work.arquivoPdf);
  if (!object || object.contentType !== "application/pdf") throw new DomainError("STORAGE_UNAVAILABLE", "O arquivo está indisponível.");
  return object.data;
}
