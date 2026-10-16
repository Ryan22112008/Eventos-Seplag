import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, PerfilUsuario, StatusEvento, StatusInscricao, StatusPresenca } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { canManageEvent } from "@backend/modules/events/event-policy";
import { createCheckinToken, createTicketToken, hashQrToken, matchesQrToken, parseCheckinToken } from "./checkin-token";
import { checkinInputSchema, organizerSessionSchema, ticketIdSchema } from "./attendance.schemas";

export type AttendanceActor = { id: string; perfil: PerfilUsuario; ativo: boolean };
export type AttendanceErrorCode = "FORBIDDEN" | "NOT_FOUND" | "TICKET_CANCELLED" | "SESSION_CLOSED" | "SESSION_NOT_OPEN" | "TOKEN_INVALID" | "TOKEN_EXPIRED" | "NOT_ENROLLED" | "ALREADY_PRESENT" | "RATE_LIMITED" | "INVALID_INPUT";

export class AttendanceError extends Error {
  constructor(readonly code: AttendanceErrorCode) { super(code); this.name = "AttendanceError"; }
}

function requireParticipant(actor: AttendanceActor) {
  if (!actor.ativo || actor.perfil !== PerfilUsuario.PARTICIPANTE) throw new AttendanceError("FORBIDDEN");
}

async function getOwnedEvent(actor: AttendanceActor, eventId: string, client: PrismaClient) {
  const event = await client.evento.findUnique({ where: { id: eventId }, select: { id: true, titulo: true, organizadorId: true, status: true } });
  if (!event || !canManageEvent(actor, event.organizadorId)) throw new AttendanceError("NOT_FOUND");
  return event;
}

export async function issueOwnTicketToken(actor: AttendanceActor, registrationId: string, client: PrismaClient = prisma) {
  requireParticipant(actor);
  const parsedId = ticketIdSchema.safeParse(registrationId);
  if (!parsedId.success) throw new AttendanceError("NOT_FOUND");
  return client.$transaction(async (tx) => {
    const registration = await tx.inscricao.findFirst({ where: { id: parsedId.data, participanteId: actor.id }, select: { id: true, status: true } });
    if (!registration) throw new AttendanceError("NOT_FOUND");
    if (registration.status !== StatusInscricao.ATIVA) throw new AttendanceError("TICKET_CANCELLED");
    const token = createTicketToken();
    const updated = await tx.inscricao.updateMany({ where: { id: registration.id, participanteId: actor.id, status: StatusInscricao.ATIVA }, data: { tokenIngresso: hashQrToken(token) } });
    if (updated.count !== 1) throw new AttendanceError("TICKET_CANCELLED");
    return token;
  });
}

export async function issueSessionCheckinToken(actor: AttendanceActor, rawIds: unknown, client: PrismaClient = prisma) {
  const ids = organizerSessionSchema.safeParse(rawIds);
  if (!ids.success || !actor.ativo || (actor.perfil !== PerfilUsuario.ORGANIZADOR && actor.perfil !== PerfilUsuario.ADMIN)) throw new AttendanceError("FORBIDDEN");
  const event = await getOwnedEvent(actor, ids.data.eventoId, client);
  if (event.status !== StatusEvento.PUBLICADO) throw new AttendanceError("SESSION_CLOSED");
  return client.$transaction(async (tx) => {
    const session = await tx.sessao.findFirst({ where: { id: ids.data.sessaoId, eventoId: event.id }, select: { id: true, nome: true, inicio: true, fim: true } });
    if (!session) throw new AttendanceError("NOT_FOUND");
    const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP(3) AS \`now\``;
    const { token, expiresAt } = createCheckinToken(session.id, now);
    await tx.sessao.update({ where: { id: session.id }, data: { tokenQr: hashQrToken(token) } });
    return { token, expiresAt, sessionName: session.nome };
  });
}

type CheckinRow = { id: string; eventId: string; sessionName: string; startAt: Date; endAt: Date; tokenHash: string | null; eventTitle: string; eventStatus: StatusEvento; now: Date };

export async function registerSessionPresence(actor: AttendanceActor, rawToken: unknown, client: PrismaClient = prisma) {
  requireParticipant(actor);
  const input = checkinInputSchema.safeParse(rawToken);
  if (!input.success) throw new AttendanceError("TOKEN_INVALID");
  const parsedToken = parseCheckinToken(input.data);
  if (!parsedToken) throw new AttendanceError("TOKEN_INVALID");
  return client.$transaction(async (tx) => {
    const [session] = await tx.$queryRaw<CheckinRow[]>`SELECT s.\`id\` AS \`id\`, s.\`evento_id\` AS \`eventId\`, s.\`nome\` AS \`sessionName\`, s.\`inicio\` AS \`startAt\`, s.\`fim\` AS \`endAt\`, s.\`token_qr_hash\` AS \`tokenHash\`, e.\`titulo\` AS \`eventTitle\`, e.\`status\` AS \`eventStatus\`, CURRENT_TIMESTAMP(3) AS \`now\` FROM \`sessoes\` s INNER JOIN \`eventos\` e ON e.\`id\` = s.\`evento_id\` WHERE s.\`id\` = ${parsedToken.sessionId} LIMIT 1`;
    if (!session || session.eventStatus !== StatusEvento.PUBLICADO) throw new AttendanceError("SESSION_CLOSED");
    if (!matchesQrToken(input.data, session.tokenHash)) throw new AttendanceError("TOKEN_INVALID");
    if (session.now.getTime() >= parsedToken.expiresAt.getTime()) throw new AttendanceError("TOKEN_EXPIRED");
    if (session.now < session.startAt) throw new AttendanceError("SESSION_NOT_OPEN");
    if (session.now >= session.endAt) throw new AttendanceError("SESSION_CLOSED");

    const activeRegistration = await tx.inscricao.findUnique({ where: { participanteId_eventoId: { participanteId: actor.id, eventoId: session.eventId } }, select: { id: true, status: true } });
    if (!activeRegistration || activeRegistration.status !== StatusInscricao.ATIVA) throw new AttendanceError("NOT_ENROLLED");

    const inserted = await tx.$executeRaw`INSERT IGNORE INTO \`presencas\` (\`id\`, \`participante_id\`, \`sessao_id\`, \`status\`, \`data_registro\`, \`alterado_por_id\`, \`data_alteracao\`, \`created_at\`, \`updated_at\`) SELECT ${randomUUID()}, ${actor.id}, s.\`id\`, 'PRESENTE', CURRENT_TIMESTAMP(3), NULL, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3) FROM \`sessoes\` s INNER JOIN \`eventos\` e ON e.\`id\` = s.\`evento_id\` INNER JOIN \`inscricoes\` i ON i.\`evento_id\` = s.\`evento_id\` AND i.\`participante_id\` = ${actor.id} AND i.\`status\` = 'ATIVA' WHERE s.\`id\` = ${session.id} AND s.\`token_qr_hash\` = ${session.tokenHash} AND e.\`status\` = 'PUBLICADO' AND s.\`inicio\` <= CURRENT_TIMESTAMP(3) AND s.\`fim\` > CURRENT_TIMESTAMP(3) AND ${parsedToken.expiresAt} > CURRENT_TIMESTAMP(3)`;
    if (inserted === 0) {
      const [existing] = await tx.$queryRaw<Array<{ dataRegistro: Date | null }>>`SELECT \`data_registro\` AS \`dataRegistro\` FROM \`presencas\` WHERE \`participante_id\` = ${actor.id} AND \`sessao_id\` = ${session.id} LIMIT 1 FOR UPDATE`;
      if (existing) throw new AttendanceError("ALREADY_PRESENT");
      const fresh = await tx.sessao.findUnique({ where: { id: session.id }, select: { tokenQr: true } });
      if (!matchesQrToken(input.data, fresh?.tokenQr ?? null)) throw new AttendanceError("TOKEN_INVALID");
      throw new AttendanceError("SESSION_CLOSED");
    }
    const attendance = await tx.presenca.findUniqueOrThrow({ where: { participanteId_sessaoId: { participanteId: actor.id, sessaoId: session.id } }, select: { dataRegistro: true } });
    return { state: "registered" as const, eventTitle: session.eventTitle, sessionName: session.sessionName, registeredAt: attendance.dataRegistro ?? session.now };
  }).catch((error: unknown) => {
    if (error instanceof AttendanceError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AttendanceError("ALREADY_PRESENT");
    console.error("Falha ao registrar presença de sessão.", error);
    throw error;
  });
}

export async function getOrganizerSessionAttendance(actor: AttendanceActor, rawIds: unknown, client: PrismaClient = prisma) {
  const ids = organizerSessionSchema.safeParse(rawIds);
  if (!ids.success || !actor.ativo || (actor.perfil !== PerfilUsuario.ORGANIZADOR && actor.perfil !== PerfilUsuario.ADMIN)) throw new AttendanceError("FORBIDDEN");
  const event = await getOwnedEvent(actor, ids.data.eventoId, client);
  const session = await client.sessao.findFirst({ where: { id: ids.data.sessaoId, eventoId: event.id }, select: { id: true, nome: true, inicio: true, fim: true, tokenQr: true } });
  if (!session) throw new AttendanceError("NOT_FOUND");
  const registrations = await client.inscricao.findMany({ where: { eventoId: event.id, status: StatusInscricao.ATIVA }, orderBy: { participante: { nome: "asc" } }, select: {
    id: true, participanteId: true, participante: { select: { nome: true } },
    // Attendance details are fetched separately so the public participant data remains scoped to this event/session.
  } });
  const presences = await client.presenca.findMany({ where: { sessaoId: session.id, status: StatusPresenca.PRESENTE }, select: { participanteId: true, dataRegistro: true } });
  const presenceByParticipant = new Map(presences.map((presence) => [presence.participanteId, presence.dataRegistro]));
  const attendees = registrations.map((registration) => ({
    inscricaoId: registration.id,
    nome: registration.participante.nome,
    status: presenceByParticipant.has(registration.participanteId) ? "PRESENTE" as const : "FALTA" as const,
    dataRegistro: presenceByParticipant.get(registration.participanteId) ?? null,
  }));
  const presentes = presences.length;
  return { event: { id: event.id, titulo: event.titulo }, session: { id: session.id, nome: session.nome, inicio: session.inicio, fim: session.fim, qrConfigured: Boolean(session.tokenQr) }, attendees, inscritos: registrations.length, presentes, ausentes: registrations.length - presentes, percentualPresenca: registrations.length === 0 ? 0 : Math.round(presentes / registrations.length * 100) };
}

export async function listOwnPresences(actor: AttendanceActor, client: PrismaClient = prisma) {
  requireParticipant(actor);
  return client.presenca.findMany({ where: { participanteId: actor.id }, orderBy: { dataRegistro: "desc" }, take: 50, select: {
    status: true, dataRegistro: true,
    sessao: { select: { nome: true, inicio: true, evento: { select: { id: true, titulo: true } } } },
  } });
}
