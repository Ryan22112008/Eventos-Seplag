import "server-only";
import { prisma } from "@backend/lib/prisma";
import { DomainError } from "@backend/lib/errors";
import { getManagedEvent, type EventActor } from "./event-service";
import { isSessionWithinEvent } from "./event-policy";
import { sessaoInputSchema } from "./event.schemas";

export async function listSessions(actor: EventActor, eventoId: string) {
  await getManagedEvent(actor, eventoId);
  return prisma.sessao.findMany({ where: { eventoId }, orderBy: { inicio: "asc" } });
}

export async function saveSession(actor: EventActor, eventoId: string, sessaoId: string | null, rawInput: unknown) {
  const event = await getManagedEvent(actor, eventoId);
  if (!["RASCUNHO", "PUBLICADO"].includes(event.status)) throw new DomainError("INVALID_STATE", "Este evento não aceita alterações.");
  const input = sessaoInputSchema.parse(rawInput);
  if (!isSessionWithinEvent({ inicio: input.inicio, fim: input.fim }, { dataInicio: event.dataInicio, dataTermino: event.dataTermino })) throw new DomainError("INVALID_DATA", "A sessão deve ocorrer dentro do período do evento.");
  const data = { nome: input.nome, inicio: input.inicio, fim: input.fim };
  if (!sessaoId) return prisma.sessao.create({ data: { ...data, eventoId, tokenQr: null } });
  if (await prisma.presenca.findFirst({ where: { sessaoId }, select: { id: true } })) throw new DomainError("INVALID_STATE", "Sessões com presenças não podem ser alteradas.");
  const result = await prisma.sessao.updateMany({ where: { id: sessaoId, eventoId }, data });
  if (result.count !== 1) throw new DomainError("NOT_FOUND", "Sessão não encontrada.");
  return prisma.sessao.findUniqueOrThrow({ where: { id: sessaoId } });
}

export async function deleteSession(actor: EventActor, eventoId: string, sessaoId: string) {
  const event = await getManagedEvent(actor, eventoId);
  if (!["RASCUNHO", "PUBLICADO"].includes(event.status)) throw new DomainError("INVALID_STATE", "Este evento não aceita alterações.");
  if (await prisma.presenca.findFirst({ where: { sessaoId }, select: { id: true } })) throw new DomainError("INVALID_STATE", "Sessões com presenças não podem ser excluídas.");
  const result = await prisma.sessao.deleteMany({ where: { id: sessaoId, eventoId } });
  if (result.count !== 1) throw new DomainError("NOT_FOUND", "Sessão não encontrada.");
}
