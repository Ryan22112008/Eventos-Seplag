"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@backend/auth/access";
import { DomainError } from "@backend/lib/errors";
import { CertificateConfigurationError } from "@backend/modules/certificates/certificate-pdf";
import { consolidateEventParticipation } from "@backend/modules/certificates/certificate-service";
import { prisma } from "@backend/lib/prisma";
import { applicationLink, sendEmail } from "@backend/lib/email/email-service";

export type ConsolidationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  result?: { alreadyConsolidated: boolean; totalParticipantes: number; concluidos: number; naoConcluidos: number; certificadosEmitidos: number };
};

export async function consolidateEventAction(_previous: ConsolidationActionState, formData: FormData): Promise<ConsolidationActionState> {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  const eventId = formData.get("eventoId");
  if (typeof eventId !== "string") return { status: "error", message: "Evento não encontrado." };
  try {
    const result = await consolidateEventParticipation(actor, eventId);
    if (!result.alreadyConsolidated && result.certificadosEmitidos > 0) {
      try {
        const recipients = await prisma.certificado.findMany({ where: { conclusao: { eventoId: eventId, situacao: "CONCLUIDO" } }, select: { conclusao: { select: { participante: { select: { nome: true, email: true } }, evento: { select: { titulo: true } } } } } });
        await Promise.all(recipients.map(({ conclusao }) => sendEmail(conclusao.participante.email, { subject: "Certificado disponível", title: "Seu certificado está disponível", paragraphs: [`Olá, ${conclusao.participante.nome}. O certificado do evento “${conclusao.evento.titulo}” já está disponível na área autenticada da plataforma.`], link: applicationLink("/participante/certificados", "Meus certificados") })));
      } catch (mailError) { console.error("Falha ao preparar notificações de certificados disponíveis.", { error: mailError instanceof Error ? mailError.name : "UnknownError" }); }
    }
    revalidatePath(`/organizador/eventos/${eventId}/frequencia`);
    revalidatePath("/participante/certificados");
    return {
      status: "success",
      message: result.alreadyConsolidated ? "Este evento já estava consolidado." : "Participações consolidadas e certificados gerados.",
      result: { alreadyConsolidated: result.alreadyConsolidated, totalParticipantes: result.totalParticipantes, concluidos: result.concluidos, naoConcluidos: result.naoConcluidos, certificadosEmitidos: result.certificadosEmitidos },
    };
  } catch (error) {
    if (error instanceof CertificateConfigurationError) return { status: "error", message: error.message };
    if (error instanceof DomainError && error.code === "INVALID_STATE") return { status: "error", message: error.message };
    if (error instanceof DomainError && error.code === "NOT_FOUND") return { status: "error", message: "Evento não encontrado." };
    console.error("Falha ao consolidar participações do evento.", error);
    return { status: "error", message: "Não foi possível consolidar as participações. Tente novamente." };
  }
}
