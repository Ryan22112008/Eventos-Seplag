import "server-only";
import { ModalidadeEvento, PerfilUsuario, Prisma, StatusEvento, StatusInscricao } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { DomainError } from "@backend/lib/errors";
import { getStorageService } from "@backend/lib/storage/local-storage-service";
import { canManageEvent, canManageEvents, canTransitionEvent, isSessionWithinEvent } from "./event-policy";
import { eventIdSchema, eventInputSchema, eventTransitionSchema, type EventInput } from "./event.schemas";

export type EventActor = { id: string; perfil: PerfilUsuario; ativo: boolean };
const editable = [StatusEvento.RASCUNHO, StatusEvento.PUBLICADO] as const;

function assertRole(actor: EventActor) {
  if (!canManageEvents(actor)) {
    throw new DomainError("FORBIDDEN", "Você não tem permissão para administrar eventos.");
  }
}

export async function getManagedEvent(actor: EventActor, eventoId: string) {
  assertRole(actor);
  eventoId = eventIdSchema.parse(eventoId);
  const event = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!event) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
  if (!canManageEvent(actor, event.organizadorId)) {
    throw new DomainError("FORBIDDEN", "Você não tem permissão para administrar este evento.");
  }
  return event;
}

export async function listManagedEvents(actor: EventActor) {
  assertRole(actor);
  return prisma.evento.findMany({
    where: actor.perfil === PerfilUsuario.ADMIN ? {} : { organizadorId: actor.id },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true, titulo: true, dataInicio: true, status: true, cidade: true, local: true },
  });
}

function eventData(input: EventInput) {
  return {
    titulo: input.titulo,
    descricao: input.descricao,
    dataInicio: input.dataInicio,
    dataTermino: input.dataTermino,
    local: input.local,
    cidade: input.cidade,
    urlGoogleMaps: input.urlGoogleMaps,
    latitude: input.latitude,
    longitude: input.longitude,
    modalidade: input.modalidade as ModalidadeEvento,
    nicho: input.nicho,
    vagasTotais: input.vagasTotais,
    cargaHoraria: new Prisma.Decimal(input.cargaHoraria),
    percentualMinimoPresenca: new Prisma.Decimal(input.percentualMinimoPresenca),
    aceitaSubmissaoTrabalhos: input.aceitaSubmissaoTrabalhos,
    inicioSubmissaoTrabalhos: input.inicioSubmissaoTrabalhos,
    fimSubmissaoTrabalhos: input.fimSubmissaoTrabalhos,
  };
}

export async function createEvent(actor: EventActor, rawInput: unknown) {
  assertRole(actor);
  const input = eventInputSchema.parse(rawInput);
  return prisma.evento.create({ data: { ...eventData(input), vagasRestantes: input.vagasTotais, organizadorId: actor.id, status: StatusEvento.RASCUNHO, presencaFinalizada: false } });
}

export async function updateEvent(actor: EventActor, eventoId: string, rawInput: unknown) {
  const current = await getManagedEvent(actor, eventoId);
  if (!editable.includes(current.status as (typeof editable)[number])) {
    throw new DomainError("INVALID_STATE", "Este evento não pode mais ser editado.");
  }
  const input = eventInputSchema.parse(rawInput);
  const sessions = await prisma.sessao.findMany({ where: { eventoId }, select: { inicio: true, fim: true } });
  if (sessions.some((session) => !isSessionWithinEvent(session, { dataInicio: input.dataInicio, dataTermino: input.dataTermino }))) {
    throw new DomainError("INVALID_DATA", "O novo período do evento deve incluir todas as sessões existentes.");
  }
  await prisma.$transaction(async (tx) => {
    // Serialize capacity edits with registration/cancellation updates of this same event row.
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT \`id\` FROM \`eventos\` WHERE \`id\` = ${current.id} FOR UPDATE`;
    if (locked.length !== 1) throw new DomainError("NOT_FOUND", "Evento não encontrado.");
    const activeRegistrations = await tx.inscricao.count({ where: { eventoId: current.id, status: StatusInscricao.ATIVA } });
    if (input.vagasTotais < activeRegistrations) throw new DomainError("INVALID_DATA", "O total de vagas não pode ser menor que as inscrições ativas.");
    const result = await tx.evento.updateMany({
      where: { id: current.id, status: current.status, ...(actor.perfil === PerfilUsuario.ADMIN ? {} : { organizadorId: actor.id }) },
      data: { ...eventData(input), vagasRestantes: input.vagasTotais - activeRegistrations },
    });
    if (result.count !== 1) throw new DomainError("CONFLICT", "O evento mudou durante a edição. Atualize a página e tente novamente.");
  });
  return getManagedEvent(actor, eventoId);
}

export async function transitionEvent(actor: EventActor, eventoId: string, status: unknown) {
  const parsed = eventTransitionSchema.parse({ eventoId, status });
  const current = await getManagedEvent(actor, parsed.eventoId);
  const target = parsed.status as StatusEvento;
  if (!canTransitionEvent(current.status, target)) throw new DomainError("INVALID_STATE", "Transição de status inválida.");
  if (target === StatusEvento.PUBLICADO && (!current.titulo.trim() || !current.descricao.trim() || current.dataTermino <= current.dataInicio || current.vagasTotais < 0 || Number(current.cargaHoraria) <= 0)) {
    throw new DomainError("INVALID_DATA", "Preencha os dados obrigatórios antes de publicar.");
  }
  const result = await prisma.evento.updateMany({
    where: { id: current.id, status: current.status, ...(actor.perfil === PerfilUsuario.ADMIN ? {} : { organizadorId: actor.id }) },
    data: { status: target },
  });
  if (result.count !== 1) throw new DomainError("CONFLICT", "O status do evento foi alterado. Atualize a página.");
  return target;
}

export async function deleteEvent(actor: EventActor, eventoId: string) {
  const current = await getManagedEvent(actor, eventoId);
  if (current.status !== StatusEvento.RASCUNHO) throw new DomainError("INVALID_STATE", "Somente rascunhos podem ser excluídos.");
  try {
    const storedKeys = await prisma.$transaction(async (tx) => {
      const related = await tx.evento.findUnique({
        where: { id: current.id },
        select: { banner: true, arteCertificadoFrente: true, arteCertificadoVerso: true, _count: { select: { disciplinas: true, sessoes: true, inscricoes: true, trabalhos: true } } },
      });
      if (!related || Object.values(related._count).some((count) => count > 0)) throw new DomainError("INVALID_STATE", "O evento possui dados relacionados e não pode ser excluído.");
      const removed = await tx.evento.deleteMany({ where: { id: current.id, status: StatusEvento.RASCUNHO, ...(actor.perfil === PerfilUsuario.ADMIN ? {} : { organizadorId: actor.id }) } });
      if (removed.count !== 1) throw new DomainError("CONFLICT", "O evento mudou. Atualize a página e tente novamente.");
      return [related.banner, related.arteCertificadoFrente, related.arteCertificadoVerso].filter((key): key is string => key !== null);
    });
    const storage = getStorageService();
    await Promise.all(storedKeys.map((key) => storage.delete(key).catch((error: unknown) => console.error("Falha ao remover arquivo órfão de evento excluído.", error))));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      throw new DomainError("INVALID_STATE", "O evento possui dados relacionados e não pode ser excluído.");
    }
    throw error;
  }
}
