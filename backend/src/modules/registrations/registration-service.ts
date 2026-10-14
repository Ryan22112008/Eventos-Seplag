import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma, PrismaClient, PerfilUsuario, StatusEvento, StatusInscricao } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { DomainError } from "@backend/lib/errors";

export type RegistrationActor = { id: string; perfil: PerfilUsuario; ativo: boolean };

function requireParticipant(actor: RegistrationActor) {
  if (!actor.ativo || actor.perfil !== PerfilUsuario.PARTICIPANTE) throw new DomainError("FORBIDDEN", "Não foi possível realizar a inscrição.");
}

function createTicketHash() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

export async function registerForEvent(actor: RegistrationActor, eventId: string, client: PrismaClient = prisma) {
  requireParticipant(actor);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
  try {
    return await client.$transaction(async (tx) => {
      const event = await tx.evento.findFirst({ where: { id: eventId, status: StatusEvento.PUBLICADO, dataTermino: { gt: new Date() } }, select: { id: true } });
      if (!event) throw new DomainError("NOT_FOUND", "Evento não encontrado ou indisponível.");
      const prior = await tx.inscricao.findUnique({ where: { participanteId_eventoId: { participanteId: actor.id, eventoId: eventId } }, select: { status: true } });
      if (prior) throw new DomainError("CONFLICT", prior.status === StatusInscricao.ATIVA ? "Você já possui uma inscrição neste evento." : "A inscrição cancelada não pode ser reativada.");
      const seats = await tx.$executeRaw`UPDATE \`eventos\` SET \`vagas_restantes\` = \`vagas_restantes\` - 1, \`updated_at\` = CURRENT_TIMESTAMP(3) WHERE \`id\` = ${eventId} AND \`status\` = 'PUBLICADO' AND \`vagas_restantes\` > 0 AND \`data_termino\` > CURRENT_TIMESTAMP(3)`;
      if (seats !== 1) throw new DomainError("INVALID_STATE", "Este evento não possui mais vagas.");
      return tx.inscricao.create({ data: { participanteId: actor.id, eventoId: eventId, tokenIngresso: createTicketHash(), status: StatusInscricao.ATIVA }, select: { id: true, status: true, createdAt: true } });
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new DomainError("CONFLICT", "Você já possui uma inscrição neste evento.");
    console.error("Falha ao inscrever participante em evento.", error);
    throw new DomainError("INVALID_STATE", "Não foi possível realizar a inscrição.");
  }
}

export async function cancelOwnRegistration(actor: RegistrationActor, registrationId: string, client: PrismaClient = prisma) {
  requireParticipant(actor);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(registrationId)) throw new DomainError("NOT_FOUND", "Inscrição não encontrada.");
  try {
    return await client.$transaction(async (tx) => {
      const current = await tx.inscricao.findFirst({ where: { id: registrationId, participanteId: actor.id }, select: { id: true, eventoId: true } });
      if (!current) throw new DomainError("NOT_FOUND", "Inscrição não encontrada.");
      const changed = await tx.inscricao.updateMany({ where: { id: current.id, participanteId: actor.id, status: StatusInscricao.ATIVA }, data: { status: StatusInscricao.CANCELADA } });
      if (changed.count === 0) return { cancelled: false };
      const returned = await tx.$executeRaw`UPDATE \`eventos\` SET \`vagas_restantes\` = \`vagas_restantes\` + 1, \`updated_at\` = CURRENT_TIMESTAMP(3) WHERE \`id\` = ${current.eventoId} AND \`vagas_restantes\` < \`vagas_totais\``;
      if (returned !== 1) throw new DomainError("INVALID_STATE", "Não foi possível cancelar a inscrição.");
      return { cancelled: true };
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    console.error("Falha ao cancelar inscrição.", error);
    throw new DomainError("INVALID_STATE", "Não foi possível cancelar a inscrição.");
  }
}
