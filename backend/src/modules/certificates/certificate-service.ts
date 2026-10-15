import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient, PerfilUsuario, SituacaoParticipacao, StatusEvento, StatusInscricao, StatusPresenca } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { DomainError } from "@backend/lib/errors";
import { canManageEvent } from "@backend/modules/events/event-policy";
import type { AttendanceActor } from "@backend/modules/attendance/attendance-service";
import { calculateAttendanceSummary } from "@backend/modules/attendance/attendance-summary";
import { getCertificateSettings, renderCertificatePdf } from "./certificate-pdf";
import { certificateCodeSchema, frequencyEventIdSchema } from "./certificate.schemas";
import { getStorageService } from "@backend/lib/storage/local-storage-service";
import type { StorageService } from "@backend/lib/storage/storage-service";

type EventAccess = { id: string; titulo: string; organizadorId: string; status: StatusEvento; dataInicio: Date; dataTermino: Date; cargaHoraria: Prisma.Decimal; percentualMinimoPresenca: Prisma.Decimal; presencaFinalizada: boolean };
type ParticipantResult = {
  participanteId: string;
  nome: string;
  situacao: SituacaoParticipacao;
  totalSessoes: number;
  sessoesPresentes: number;
  sessoesAusentes: number;
  percentualFrequencia: number;
  elegivel: boolean;
  certificadoId: string | null;
};
type RegistrationRow = { id: string; participanteId: string; status: StatusInscricao; participante: { nome: string } };
type PresenceRow = { participanteId: string; sessaoId: string; status: StatusPresenca };
type SessionRow = { id: string; fim: Date };
type OwnRegistrationRow = {
  id: string; status: StatusInscricao;
  evento: { id: string; titulo: string; dataInicio: Date; dataTermino: Date; cargaHoraria: Prisma.Decimal; percentualMinimoPresenca: Prisma.Decimal; status: StatusEvento };
};

export type OrganizerFrequencyReport = {
  event: { id: string; titulo: string; status: StatusEvento; dataInicio: Date; dataTermino: Date; cargaHoraria: string; percentualMinimoPresenca: string; presencaFinalizada: boolean };
  participants: ParticipantResult[];
  totalParticipantes: number;
  concluidos: number;
  naoConcluidos: number;
  emAndamento: number;
  certificadosEmitidos: number;
};

export type ParticipantParticipationSummary = {
  inscricaoId: string;
  inscricaoStatus: StatusInscricao;
  event: OwnRegistrationRow["evento"];
  summary: ReturnType<typeof calculateAttendanceSummary>;
  certificadoId: string | null;
};

function presencesByParticipant(rows: Array<{ participanteId: string; sessaoId: string; status: StatusPresenca }>) {
  const grouped = new Map<string, Array<{ sessaoId: string; status: StatusPresenca }>>();
  for (const row of rows) grouped.set(row.participanteId, [...(grouped.get(row.participanteId) ?? []), { sessaoId: row.sessaoId, status: row.status }]);
  return grouped;
}

async function getAuthorizedEvent(actor: AttendanceActor, eventId: string, client: PrismaClient): Promise<EventAccess> {
  if (!actor.ativo || ![PerfilUsuario.ORGANIZADOR, PerfilUsuario.ADMIN].includes(actor.perfil)) throw new DomainError("FORBIDDEN");
  const parsedId = frequencyEventIdSchema.safeParse(eventId);
  if (!parsedId.success) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
  const event = await client.evento.findUnique({ where: { id: parsedId.data } });
  if (!event || !canManageEvent(actor, event.organizadorId)) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
  return event;
}

function frequencyRecordsFromSnapshots(rows: Array<{
  participanteId: string; participante: { nome: string }; situacao: SituacaoParticipacao; sessoesTotais: number;
  sessoesPresentes: number; percentualFrequencia: Prisma.Decimal; certificado: { id: string } | null;
}>): ParticipantResult[] {
  return rows.map((row) => ({
    participanteId: row.participanteId, nome: row.participante.nome,
    situacao: row.situacao, totalSessoes: row.sessoesTotais, sessoesPresentes: row.sessoesPresentes,
    sessoesAusentes: row.sessoesTotais - row.sessoesPresentes, percentualFrequencia: Number(row.percentualFrequencia),
    elegivel: row.situacao === SituacaoParticipacao.CONCLUIDO, certificadoId: row.certificado?.id ?? null,
  }));
}

function reportTotals(event: EventAccess, participants: ParticipantResult[], alreadyConsolidated = event.presencaFinalizada) {
  return {
    event: { id: event.id, titulo: event.titulo, status: event.status, dataInicio: event.dataInicio, dataTermino: event.dataTermino, cargaHoraria: event.cargaHoraria.toString(), percentualMinimoPresenca: event.percentualMinimoPresenca.toString(), presencaFinalizada: alreadyConsolidated },
    participants,
    totalParticipantes: participants.length,
    concluidos: participants.filter((person) => person.situacao === SituacaoParticipacao.CONCLUIDO).length,
    naoConcluidos: participants.filter((person) => person.situacao === SituacaoParticipacao.NAO_CONCLUIDO).length,
    emAndamento: participants.filter((person) => person.situacao === SituacaoParticipacao.EM_ANDAMENTO).length,
    certificadosEmitidos: participants.filter((person) => person.certificadoId !== null).length,
  };
}

async function getStoredReport(tx: Prisma.TransactionClient, event: EventAccess): Promise<OrganizerFrequencyReport> {
  const rows = await tx.conclusaoParticipante.findMany({
    where: { eventoId: event.id }, orderBy: { participante: { nome: "asc" } },
    select: { participanteId: true, participante: { select: { nome: true } }, situacao: true, sessoesTotais: true, sessoesPresentes: true, percentualFrequencia: true, certificado: { select: { id: true } } },
  }) as Array<{ participanteId: string; participante: { nome: string }; situacao: SituacaoParticipacao; sessoesTotais: number; sessoesPresentes: number; percentualFrequencia: Prisma.Decimal; certificado: { id: string } | null }>;
  return reportTotals(event, frequencyRecordsFromSnapshots(rows), true);
}

export async function getEventFrequencyReport(actor: AttendanceActor, eventId: string, client: PrismaClient = prisma): Promise<OrganizerFrequencyReport> {
  const event = await getAuthorizedEvent(actor, eventId, client);
  if (event.presencaFinalizada) return client.$transaction((tx) => getStoredReport(tx, event));
  const [sessions, registrations] = await Promise.all([
    client.sessao.findMany({ where: { eventoId: event.id }, orderBy: { inicio: "asc" }, select: { id: true } }),
    client.inscricao.findMany({ where: { eventoId: event.id, status: { in: [StatusInscricao.ATIVA, StatusInscricao.CONCLUIDA] } }, orderBy: { participante: { nome: "asc" } }, select: { id: true, participanteId: true, status: true, participante: { select: { nome: true } } } }),
  ]) as [Array<{ id: string }>, RegistrationRow[]];
  const sessionIds = sessions.map((session) => session.id);
  const presences = sessionIds.length ? await client.presenca.findMany({ where: { sessaoId: { in: sessionIds }, status: StatusPresenca.PRESENTE }, select: { sessaoId: true, participanteId: true, status: true } }) as PresenceRow[] : [];
  const attendanceByParticipant = presencesByParticipant(presences);
  const participants = registrations.map((registration) => {
    const summary = calculateAttendanceSummary({
      sessionIds,
      presences: attendanceByParticipant.get(registration.participanteId) ?? [],
      minimumPercentage: event.percentualMinimoPresenca.toString(),
      eventStatus: event.status,
      registrationStatus: registration.status,
    });
    return { ...summary, participanteId: registration.participanteId, nome: registration.participante.nome, certificadoId: null };
  });
  return reportTotals(event, participants, false);
}

export async function consolidateEventParticipation(actor: AttendanceActor, eventId: string, client: PrismaClient = prisma, storage: StorageService = getStorageService()) {
  const event = await getAuthorizedEvent(actor, eventId, client);
  const writtenKeys: string[] = [];
  try {
    return await client.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ id: string }>>`SELECT \`id\` FROM \`eventos\` WHERE \`id\` = ${event.id} FOR UPDATE`;
      if (lock.length !== 1) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
      const current = await tx.evento.findUnique({ where: { id: event.id } });
      if (!current || !canManageEvent(actor, current.organizadorId)) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
      if (current.presencaFinalizada) return { alreadyConsolidated: true, ...(await getStoredReport(tx, current)) };
      const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP(3) AS \`now\``;
      if (current.status !== StatusEvento.ENCERRADO || current.dataTermino > now) throw new DomainError("INVALID_STATE", "Encerre o evento e aguarde o término do período antes de consolidar.");

      const sessions = await tx.sessao.findMany({ where: { eventoId: current.id }, orderBy: { inicio: "asc" }, select: { id: true, fim: true } }) as SessionRow[];
      if (sessions.some((session) => session.fim > now)) throw new DomainError("INVALID_STATE", "Aguarde o fim de todas as sessões antes de consolidar.");
      const registrations = await tx.inscricao.findMany({
        where: { eventoId: current.id, status: { in: [StatusInscricao.ATIVA, StatusInscricao.CONCLUIDA] } },
        orderBy: { participante: { nome: "asc" } },
        select: { id: true, participanteId: true, status: true, participante: { select: { nome: true } } },
      }) as RegistrationRow[];
      const sessionIds = sessions.map((session) => session.id);
      const presences = sessionIds.length ? await tx.presenca.findMany({ where: { sessaoId: { in: sessionIds }, status: StatusPresenca.PRESENTE }, select: { sessaoId: true, participanteId: true, status: true } }) as PresenceRow[] : [];
      const attendanceByParticipant = presencesByParticipant(presences);
      const participants = registrations.map((registration) => ({
        registration,
        summary: calculateAttendanceSummary({
          sessionIds, presences: attendanceByParticipant.get(registration.participanteId) ?? [],
          minimumPercentage: current.percentualMinimoPresenca.toString(), eventStatus: current.status, registrationStatus: registration.status,
        }),
      }));
      const eligibleCount = participants.filter(({ summary }) => summary.elegivel).length;
      const settings = eligibleCount ? await getCertificateSettings() : null;

      const issuedIds = new Map<string, string>();
      for (const { registration, summary } of participants) {
        const conclusionId = randomUUID();
        await tx.conclusaoParticipante.create({ data: {
          id: conclusionId, participanteId: registration.participanteId, eventoId: current.id,
          sessoesTotais: summary.totalSessoes, sessoesPresentes: summary.sessoesPresentes,
          percentualFrequencia: new Prisma.Decimal(summary.percentualFrequencia.toFixed(2)), situacao: summary.situacao,
          consolidadoEm: now,
        } });
        if (!summary.elegivel || !settings) continue;
        const codigo = randomUUID();
        const certificateId = randomUUID();
        const fileKey = `${current.id}/certificados/${registration.participanteId}/${certificateId}.pdf`;
        const pdf = await renderCertificatePdf({
          ...settings, participantName: registration.participante.nome, eventTitle: current.titulo,
          eventStart: current.dataInicio, eventEnd: current.dataTermino, workloadHours: current.cargaHoraria.toString(),
          issuedAt: now, code: codigo,
        });
        writtenKeys.push(fileKey);
        await storage.put(fileKey, pdf, "application/pdf");
        await tx.certificado.create({ data: { id: certificateId, codigo, conclusaoId: conclusionId, arquivoPdf: fileKey, emitidoEm: now } });
        issuedIds.set(registration.participanteId, certificateId);
      }
      const finalized = await tx.evento.updateMany({ where: { id: current.id, status: StatusEvento.ENCERRADO, presencaFinalizada: false }, data: { presencaFinalizada: true } });
      if (finalized.count !== 1) throw new DomainError("CONFLICT", "O evento mudou durante a consolidação. Tente novamente.");
      const report = reportTotals({ ...current, presencaFinalizada: true }, participants.map(({ registration, summary }) => ({
        ...summary, participanteId: registration.participanteId, nome: registration.participante.nome,
        certificadoId: issuedIds.get(registration.participanteId) ?? null,
      })));
      const issuedCount = eligibleCount;
      return { alreadyConsolidated: false, ...report, certificadosEmitidos: issuedCount };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 120_000 });
  } catch (error) {
    await Promise.all(writtenKeys.map(async (key) => {
      try {
        const committed = await client.certificado.findFirst({ where: { arquivoPdf: key }, select: { id: true } });
        if (!committed) await storage.delete(key);
      } catch (cleanupError) {
        console.error("Falha ao verificar ou limpar PDF de consolidação revertida.", cleanupError);
      }
    }));
    throw error;
  }
}

export async function getOwnParticipationSummaries(actor: AttendanceActor, client: PrismaClient = prisma): Promise<ParticipantParticipationSummary[]> {
  if (!actor.ativo || actor.perfil !== PerfilUsuario.PARTICIPANTE) throw new DomainError("FORBIDDEN");
  const registrations = await client.inscricao.findMany({
    where: { participanteId: actor.id }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, status: true, evento: { select: { id: true, titulo: true, dataInicio: true, dataTermino: true, cargaHoraria: true, percentualMinimoPresenca: true, status: true } } },
  }) as OwnRegistrationRow[];
  const eventIds = [...new Set(registrations.map((registration) => registration.evento.id))];
  const [sessions, presences, conclusions] = (eventIds.length ? await Promise.all([
    client.sessao.findMany({ where: { eventoId: { in: eventIds } }, select: { id: true, eventoId: true } }),
    client.presenca.findMany({ where: { participanteId: actor.id, sessao: { eventoId: { in: eventIds } }, status: StatusPresenca.PRESENTE }, select: { sessaoId: true, status: true } }),
    client.conclusaoParticipante.findMany({ where: { participanteId: actor.id, eventoId: { in: eventIds } }, select: { eventoId: true, sessoesTotais: true, sessoesPresentes: true, percentualFrequencia: true, situacao: true, certificado: { select: { id: true } } } }),
  ]) : [[], [], []]) as [Array<{ id: string; eventoId: string }>, Array<{ sessaoId: string; status: StatusPresenca }>, Array<{ eventoId: string; sessoesTotais: number; sessoesPresentes: number; percentualFrequencia: Prisma.Decimal; situacao: SituacaoParticipacao; certificado: { id: string } | null }>];
  const sessionIdsByEvent = new Map<string, string[]>();
  for (const session of sessions) sessionIdsByEvent.set(session.eventoId, [...(sessionIdsByEvent.get(session.eventoId) ?? []), session.id]);
  const presenceBySession = new Map(presences.map((presence) => [presence.sessaoId, presence]));
  const conclusionsByEvent = new Map(conclusions.map((conclusion) => [conclusion.eventoId, conclusion]));
  return registrations.map((registration) => {
    const event = registration.evento;
    const conclusion = conclusionsByEvent.get(event.id);
    if (conclusion) return {
      inscricaoId: registration.id, inscricaoStatus: registration.status, event,
      summary: {
        totalSessoes: conclusion.sessoesTotais, sessoesPresentes: conclusion.sessoesPresentes,
        sessoesAusentes: conclusion.sessoesTotais - conclusion.sessoesPresentes,
        percentualFrequencia: Number(conclusion.percentualFrequencia), situacao: conclusion.situacao,
        elegivel: conclusion.situacao === SituacaoParticipacao.CONCLUIDO,
      },
      certificadoId: conclusion.certificado?.id ?? null,
    };
    const validStatus = registration.status === StatusInscricao.ATIVA || registration.status === StatusInscricao.CONCLUIDA;
    const eventSessions = validStatus ? (sessionIdsByEvent.get(event.id) ?? []) : [];
    const summary = calculateAttendanceSummary({
      sessionIds: eventSessions,
      presences: eventSessions.map((sessaoId) => presenceBySession.get(sessaoId)).filter((value): value is NonNullable<typeof value> => value !== undefined),
      minimumPercentage: event.percentualMinimoPresenca.toString(), eventStatus: event.status, registrationStatus: registration.status,
    });
    return { inscricaoId: registration.id, inscricaoStatus: registration.status, event, summary, certificadoId: null };
  });
}

export async function getPublicCertificate(rawCode: string, client: PrismaClient = prisma) {
  const parsed = certificateCodeSchema.safeParse(rawCode);
  if (!parsed.success) return null;
  return client.certificado.findUnique({ where: { codigo: parsed.data }, select: {
    codigo: true, emitidoEm: true,
    conclusao: { select: {
      situacao: true, participante: { select: { nome: true } },
      evento: { select: { titulo: true, dataInicio: true, dataTermino: true, cargaHoraria: true } },
    } },
  } }).then((certificate) => certificate?.conclusao.situacao === SituacaoParticipacao.CONCLUIDO ? certificate : null);
}

export async function getOwnCertificatePdf(actor: AttendanceActor, certificateId: string, client: PrismaClient = prisma, storage: StorageService = getStorageService()) {
  if (!actor.ativo || actor.perfil !== PerfilUsuario.PARTICIPANTE || !frequencyEventIdSchema.safeParse(certificateId).success) throw new DomainError("NOT_FOUND", "Certificado não encontrado.");
  const certificate = await client.certificado.findFirst({ where: { id: certificateId, conclusao: { participanteId: actor.id, situacao: SituacaoParticipacao.CONCLUIDO } }, select: { arquivoPdf: true } });
  if (!certificate) throw new DomainError("NOT_FOUND", "Certificado não encontrado.");
  const file = await storage.get(certificate.arquivoPdf);
  if (!file || file.contentType !== "application/pdf") throw new DomainError("STORAGE_UNAVAILABLE", "O arquivo do certificado está indisponível.");
  return file.data;
}
