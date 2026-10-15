"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@backend/auth/access";
import { decisaoOrganizadorSchema, alteracaoAtivoSchema } from "@backend/auth/schemas";
import { decideOrganizerRequest, setUserActive } from "@backend/auth/admin-service";
import { prisma } from "@backend/lib/prisma";
import { applicationLink, sendEmail } from "@backend/lib/email/email-service";
import { consumeRateLimit } from "@backend/auth/rate-limit";

async function notifyOrganizerDecision(solicitacaoId: string, result: string, approved: boolean) {
  if (result !== "done") return;
  try {
    const request = await prisma.solicitacaoOrganizador.findUnique({ where: { id: solicitacaoId }, select: { usuario: { select: { email: true, nome: true } } } });
    if (!request) return;
    await sendEmail(request.usuario.email, { subject: approved ? "Solicitação de organizador aprovada" : "Solicitação de organizador rejeitada", title: approved ? "Solicitação aprovada" : "Solicitação não aprovada", paragraphs: [approved ? `Olá, ${request.usuario.nome}. Sua solicitação foi aprovada. Seu perfil já está atualizado na plataforma.` : `Olá, ${request.usuario.nome}. Sua solicitação para organizar eventos não foi aprovada.`], link: applicationLink("/login", "Acessar a plataforma") });
  } catch (error) { console.error("Falha ao preparar notificação de decisão de organizador.", { error: error instanceof Error ? error.name : "UnknownError" }); }
}

export async function approveOrganizerAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!consumeRateLimit(`admin-organizer-decision:${admin.id}`, { limit: 30, windowMs: 60 * 60_000 }).allowed) redirect("/admin/solicitacoes-organizador?resultado=rate");
  const parsed = decisaoOrganizadorSchema.safeParse({ solicitacaoId: formData.get("solicitacaoId") });
  if (!parsed.success) redirect("/admin/solicitacoes-organizador?resultado=invalid");
  const result = await decideOrganizerRequest({ solicitacaoId: parsed.data.solicitacaoId, adminId: admin.id, decisao: "aprovar" });
  await notifyOrganizerDecision(parsed.data.solicitacaoId, result, true);
  redirect(`/admin/solicitacoes-organizador?resultado=${result}`);
}

export async function rejectOrganizerAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!consumeRateLimit(`admin-organizer-decision:${admin.id}`, { limit: 30, windowMs: 60 * 60_000 }).allowed) redirect("/admin/solicitacoes-organizador?resultado=rate");
  const parsed = decisaoOrganizadorSchema.safeParse({ solicitacaoId: formData.get("solicitacaoId") });
  if (!parsed.success) redirect("/admin/solicitacoes-organizador?resultado=invalid");
  const result = await decideOrganizerRequest({ solicitacaoId: parsed.data.solicitacaoId, adminId: admin.id, decisao: "rejeitar" });
  await notifyOrganizerDecision(parsed.data.solicitacaoId, result, false);
  redirect(`/admin/solicitacoes-organizador?resultado=${result}`);
}

export async function setUserActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!consumeRateLimit(`admin-account-status:${admin.id}`, { limit: 30, windowMs: 60 * 60_000 }).allowed) redirect("/admin/usuarios?resultado=rate");
  const parsed = alteracaoAtivoSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    ativo: formData.get("ativo"),
  });
  if (!parsed.success) redirect("/admin/usuarios?resultado=invalid");
  const result = await setUserActive({ actorId: admin.id, ...parsed.data });
  redirect(`/admin/usuarios?resultado=${result}`);
}
