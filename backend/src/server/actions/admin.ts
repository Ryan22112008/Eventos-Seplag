"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@backend/auth/access";
import { decisaoOrganizadorSchema, alteracaoAtivoSchema } from "@backend/auth/schemas";
import { decideOrganizerRequest, setUserActive } from "@backend/auth/admin-service";

export async function approveOrganizerAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = decisaoOrganizadorSchema.safeParse({ solicitacaoId: formData.get("solicitacaoId") });
  if (!parsed.success) redirect("/admin/solicitacoes-organizador?resultado=invalid");
  const result = await decideOrganizerRequest({ solicitacaoId: parsed.data.solicitacaoId, adminId: admin.id, decisao: "aprovar" });
  redirect(`/admin/solicitacoes-organizador?resultado=${result}`);
}

export async function rejectOrganizerAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = decisaoOrganizadorSchema.safeParse({ solicitacaoId: formData.get("solicitacaoId") });
  if (!parsed.success) redirect("/admin/solicitacoes-organizador?resultado=invalid");
  const result = await decideOrganizerRequest({ solicitacaoId: parsed.data.solicitacaoId, adminId: admin.id, decisao: "rejeitar" });
  redirect(`/admin/solicitacoes-organizador?resultado=${result}`);
}

export async function setUserActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = alteracaoAtivoSchema.safeParse({
    usuarioId: formData.get("usuarioId"),
    ativo: formData.get("ativo"),
  });
  if (!parsed.success) redirect("/admin/usuarios?resultado=invalid");
  const result = await setUserActive({ actorId: admin.id, ...parsed.data });
  redirect(`/admin/usuarios?resultado=${result}`);
}
