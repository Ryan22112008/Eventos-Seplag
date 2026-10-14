"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { registerForEvent, cancelOwnRegistration } from "@backend/modules/registrations/registration-service";
import { DomainError } from "@backend/lib/errors";

export async function registerForEventAction(formData: FormData): Promise<void> {
  const user = await requireRole("PARTICIPANTE");
  const eventId = formData.get("eventoId");
  if (typeof eventId !== "string") redirect("/eventos?inscricao=erro");
  try { await registerForEvent(user, eventId); } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const code = error instanceof DomainError ? error.code : "unexpected";
    redirect(`/eventos/${encodeURIComponent(eventId)}?inscricao=${code.toLowerCase()}`);
  }
  redirect(`/eventos/${encodeURIComponent(eventId)}?inscricao=ok`);
}

export async function cancelOwnRegistrationAction(formData: FormData): Promise<void> {
  const user = await requireRole("PARTICIPANTE");
  const registrationId = formData.get("inscricaoId");
  if (typeof registrationId !== "string") redirect("/participante?inscricao=erro");
  try { await cancelOwnRegistration(user, registrationId); } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/participante?inscricao=erro");
  }
  redirect("/participante?inscricao=cancelada");
}
