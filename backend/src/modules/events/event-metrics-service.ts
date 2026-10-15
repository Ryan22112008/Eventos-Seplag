import "server-only";
import { PerfilUsuario, PrismaClient, StatusInscricao, StatusTrabalhoCientifico, StatusPresenca } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { DomainError } from "@backend/lib/errors";
import { canManageEvent } from "./event-policy";
import { getEventFrequencyReport } from "@backend/modules/certificates/certificate-service";
import { calculateEventRates } from "./event-metrics";

export async function getEventMetrics(actor: { id: string; perfil: PerfilUsuario; ativo: boolean }, eventId: string, client: PrismaClient = prisma) {
  if (!actor.ativo || ![PerfilUsuario.ORGANIZADOR, PerfilUsuario.ADMIN].includes(actor.perfil)) throw new DomainError("FORBIDDEN", "Acesso negado.");
  const event = await client.evento.findUnique({ where: { id: eventId }, select: { id: true, titulo: true, vagasTotais: true, vagasRestantes: true, presencaFinalizada: true, organizadorId: true } });
  if (!event || !canManageEvent(actor, event.organizadorId)) throw new DomainError("NOT_FOUND", "Evento não encontrado.");

  const [registrationTotal, active, cancelled, sessions, presentParticipants, workGroups, certificates, frequency] = await Promise.all([
    client.inscricao.count({ where: { eventoId: event.id } }),
    client.inscricao.count({ where: { eventoId: event.id, status: StatusInscricao.ATIVA } }),
    client.inscricao.count({ where: { eventoId: event.id, status: StatusInscricao.CANCELADA } }),
    client.sessao.count({ where: { eventoId: event.id } }),
    client.presenca.groupBy({ by: ["participanteId"], where: { sessao: { eventoId: event.id }, status: StatusPresenca.PRESENTE, participante: { inscricoes: { some: { eventoId: event.id, status: { in: [StatusInscricao.ATIVA, StatusInscricao.CONCLUIDA] } } } } } }),
    client.trabalhoCientifico.groupBy({ by: ["status"], where: { eventoId: event.id }, _count: { _all: true } }),
    client.certificado.count({ where: { conclusao: { eventoId: event.id } } }),
    getEventFrequencyReport(actor, event.id, client),
  ]);
  const workCounts = new Map(workGroups.map((row) => [row.status, row._count._all]));
  const validParticipants = frequency.totalParticipantes;
  return {
    event: { id: event.id, titulo: event.titulo, vagasTotais: event.vagasTotais, vagasRestantes: event.vagasRestantes },
    registrations: { total: registrationTotal, active, cancelled },
    sessions,
    participantsPresent: presentParticipants.length,
    attendance: { total: validParticipants, concluded: frequency.concluidos, incomplete: frequency.naoConcluidos, inProgress: frequency.emAndamento, concludedRate: validParticipants ? frequency.concluidos / validParticipants * 100 : null },
    certificates: certificates,
    works: {
      total: workGroups.reduce((total, row) => total + row._count._all, 0),
      submitted: workCounts.get(StatusTrabalhoCientifico.SUBMETIDO) ?? 0,
      inReview: workCounts.get(StatusTrabalhoCientifico.EM_AVALIACAO) ?? 0,
      approved: workCounts.get(StatusTrabalhoCientifico.APROVADO) ?? 0,
      rejected: workCounts.get(StatusTrabalhoCientifico.REJEITADO) ?? 0,
    },
    ...calculateEventRates(active, event.vagasTotais, presentParticipants.length, validParticipants),
    attendanceFinalized: event.presencaFinalizada,
  };
}
