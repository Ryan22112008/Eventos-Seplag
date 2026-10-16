"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { registerForEvent, cancelOwnRegistration } from "@backend/modules/registrations/registration-service";
import { DomainError } from "@backend/lib/errors";
import { prisma } from "@backend/lib/prisma";
import { isDevMockMode } from "@backend/lib/dev-mode";
import { applicationLink, sendEmail } from "@backend/lib/email/email-service";
import { consumeRateLimit } from "@backend/auth/rate-limit";

export async function registerForEventAction(formData: FormData): Promise<void> {
  if (isDevMockMode()) {
    const eventId = formData.get("eventoId");
    if (typeof eventId === "string") redirect(`/eventos/${encodeURIComponent(eventId)}?inscricao=ok`);
    redirect("/eventos?inscricao=erro");
  }
  const user = await requireRole("PARTICIPANTE");
  if (!consumeRateLimit(`event-registration:${user.id}`, { limit: 20, windowMs: 60 * 60_000 }).allowed) redirect("/eventos?inscricao=rate");
  const eventId = formData.get("eventoId");
  if (typeof eventId !== "string") redirect("/eventos?inscricao=erro");
  try {
    await registerForEvent(user, eventId);
    try {
      const details = await prisma.inscricao.findUnique({ where: { participanteId_eventoId: { participanteId: user.id, eventoId: eventId } }, select: { evento: { select: { titulo: true } } } });
      if (details) await sendEmail(user.email, { subject: "Inscrição confirmada", title: "Sua inscrição foi confirmada", paragraphs: [`Sua inscrição no evento “${details.evento.titulo}” está ativa. Você pode consultar os detalhes na área do participante.`], link: applicationLink("/participante", "Área do participante") });
    } catch (mailError) { console.error("Falha ao preparar confirmação de inscrição.", { error: mailError instanceof Error ? mailError.name : "UnknownError" }); }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof DomainError ? error.code : "unexpected";
    redirect(`/eventos/${encodeURIComponent(eventId)}?inscricao=${code.toLowerCase()}`);
  }
  redirect(`/eventos/${encodeURIComponent(eventId)}?inscricao=ok`);
}

export async function cancelOwnRegistrationAction(formData: FormData): Promise<void> {
  const user = await requireRole("PARTICIPANTE");
  if (!consumeRateLimit(`registration-cancel:${user.id}`, { limit: 20, windowMs: 60 * 60_000 }).allowed) redirect("/participante?inscricao=rate");
  const registrationId = formData.get("inscricaoId");
  if (typeof registrationId !== "string") redirect("/participante?inscricao=erro");
  try {
    const result = await cancelOwnRegistration(user, registrationId);
    if (result.cancelled) {
      try {
        const details = await prisma.inscricao.findUnique({ where: { id: registrationId }, select: { evento: { select: { titulo: true } } } });
        if (details) await sendEmail(user.email, { subject: "Inscrição cancelada", title: "Sua inscrição foi cancelada", paragraphs: [`A inscrição no evento “${details.evento.titulo}” foi cancelada conforme solicitado.`] });
      } catch (mailError) { console.error("Falha ao preparar confirmação de cancelamento.", { error: mailError instanceof Error ? mailError.name : "UnknownError" }); }
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/participante?inscricao=erro");
  }
  redirect("/participante?inscricao=cancelada");
}
