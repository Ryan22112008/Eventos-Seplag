import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { DomainError } from "@backend/lib/errors";
import { getManagedEvent, type EventActor } from "./event-service";
import { disciplinaInputSchema } from "./event.schemas";

export async function listDisciplines(actor: EventActor, eventoId: string) {
  await getManagedEvent(actor, eventoId);
  return prisma.disciplina.findMany({ where: { eventoId }, orderBy: { nome: "asc" } });
}

export async function saveDiscipline(actor: EventActor, eventoId: string, disciplinaId: string | null, rawInput: unknown) {
  const event = await getManagedEvent(actor, eventoId);
  if (!["RASCUNHO", "PUBLICADO"].includes(event.status)) throw new DomainError("INVALID_STATE", "Este evento não aceita alterações.");
  const input = disciplinaInputSchema.parse(rawInput);
  const data = { nome: input.nome, cargaHoraria: new Prisma.Decimal(input.cargaHoraria) };
  if (!disciplinaId) return prisma.disciplina.create({ data: { ...data, eventoId } });
  const result = await prisma.disciplina.updateMany({
    where: { id: disciplinaId, eventoId },
    data,
  });
  if (result.count !== 1) throw new DomainError("NOT_FOUND", "Disciplina não encontrada.");
  return prisma.disciplina.findUniqueOrThrow({ where: { id: disciplinaId } });
}

export async function deleteDiscipline(actor: EventActor, eventoId: string, disciplinaId: string) {
  const event = await getManagedEvent(actor, eventoId);
  if (!["RASCUNHO", "PUBLICADO"].includes(event.status)) throw new DomainError("INVALID_STATE", "Este evento não aceita alterações.");
  const result = await prisma.disciplina.deleteMany({ where: { id: disciplinaId, eventoId } });
  if (result.count !== 1) throw new DomainError("NOT_FOUND", "Disciplina não encontrada.");
}
