"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@backend/auth/access";
import { assignScientificWorkReviewer, submitScientificWorkEvaluation } from "@backend/modules/scientific-works/work-service";
import { DomainError } from "@backend/lib/errors";
import { z } from "zod";
import { prisma } from "@backend/lib/prisma";
import { applicationLink, sendEmail } from "@backend/lib/email/email-service";

function text(form: FormData, key: string) { return form.get(key)?.toString() ?? ""; }

export async function assignScientificWorkAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  const workId = text(form, "trabalhoId");
  const eventId = z.uuid().safeParse(text(form, "eventoId"));
  try {
    const assignment = await assignScientificWorkReviewer(actor, { trabalhoId: workId, avaliadorId: text(form, "avaliadorId") });
    revalidatePath("/organizador/eventos");
    redirect(`/organizador/eventos/${assignment.eventoId}/trabalhos?atribuicao=ok`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const outcome = error instanceof DomainError ? error.code.toLowerCase() : "erro";
    redirect(eventId.success ? `/organizador/eventos/${eventId.data}/trabalhos?atribuicao=${outcome}` : "/organizador/eventos");
  }
}

export async function evaluateScientificWorkAction(form: FormData) {
  const actor = await requireRole("AVALIADOR");
  const workId = text(form, "trabalhoId");
  try {
    const result = await submitScientificWorkEvaluation(actor, { trabalhoId: workId, resultado: text(form, "resultado"), parecer: text(form, "parecer") });
    try {
      const work = await prisma.trabalhoCientifico.findUnique({ where: { id: workId }, select: { titulo: true, autor: { select: { nome: true, email: true } }, evento: { select: { titulo: true } } } });
      if (work) await sendEmail(work.autor.email, { subject: result.status === "APROVADO" ? "Trabalho científico aprovado" : "Resultado da avaliação do trabalho", title: result.status === "APROVADO" ? "Trabalho aprovado" : "Trabalho não aprovado", paragraphs: [`Olá, ${work.autor.nome}. A avaliação de “${work.titulo}”, submetido ao evento “${work.evento.titulo}”, foi concluída. Consulte o parecer na plataforma.`], link: applicationLink(`/participante/trabalhos/${workId}`, "Consultar trabalho") });
    } catch (mailError) { console.error("Falha ao preparar notificação de avaliação científica.", { error: mailError instanceof Error ? mailError.name : "UnknownError" }); }
    revalidatePath("/avaliador/trabalhos");
    revalidatePath(`/participante/trabalhos/${workId}`);
    redirect(`/avaliador/trabalhos/${workId}?avaliacao=ok`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const outcome = error instanceof DomainError ? error.code.toLowerCase() : "erro";
    redirect(`/avaliador/trabalhos/${workId}?avaliacao=${outcome}`);
  }
}
