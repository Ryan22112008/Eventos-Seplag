import "server-only";
import { Prisma, PerfilUsuario, StatusSolicitacaoOrganizador } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { podeDesativarUsuario } from "./policy";

export async function decideOrganizerRequest(input: {
  solicitacaoId: string;
  adminId: string;
  decisao: "aprovar" | "rejeitar";
}): Promise<"done" | "already_processed" | "not_found"> {
  return prisma.$transaction(async (tx): Promise<"done" | "already_processed" | "not_found"> => {
    const request = await tx.solicitacaoOrganizador.findUnique({
      where: { id: input.solicitacaoId }, select: { id: true, usuarioId: true, status: true },
    });
    if (!request) return "not_found";
    if (request.status !== StatusSolicitacaoOrganizador.PENDENTE) return "already_processed";

    const now = new Date();
    const nextStatus = input.decisao === "aprovar"
      ? StatusSolicitacaoOrganizador.APROVADO
      : StatusSolicitacaoOrganizador.REJEITADO;
    const claimed = await tx.solicitacaoOrganizador.updateMany({
      where: { id: request.id, status: StatusSolicitacaoOrganizador.PENDENTE },
      data: { status: nextStatus, decididoPorId: input.adminId, decididoEm: now },
    });
    if (claimed.count !== 1) return "already_processed";

    if (input.decisao === "aprovar") {
      await tx.usuario.update({ where: { id: request.usuarioId }, data: { perfil: PerfilUsuario.ORGANIZADOR } });
    }
    return "done";
  });
}

export type UserStatusResult = "changed" | "unchanged" | "not_found" | "self_protected" | "last_admin" | "conflict";

export async function setUserActive(input: { actorId: string; usuarioId: string; ativo: boolean }): Promise<UserStatusResult> {
  try {
    return await prisma.$transaction(async (tx): Promise<UserStatusResult> => {
      const target = await tx.usuario.findUnique({
        where: { id: input.usuarioId }, select: { id: true, ativo: true, perfil: true },
      });
      if (!target) return "not_found";
      if (target.ativo === input.ativo) return "unchanged";

      const quantidadeAdminsAtivos = target.perfil === PerfilUsuario.ADMIN && target.ativo && !input.ativo
        ? await tx.usuario.count({ where: { perfil: PerfilUsuario.ADMIN, ativo: true } })
        : 0;
      if (!podeDesativarUsuario({
        atorId: input.actorId,
        alvoId: target.id,
        alvoAtivo: target.ativo,
        alvoEhAdmin: target.perfil === PerfilUsuario.ADMIN,
        quantidadeAdminsAtivos,
        ativoDesejado: input.ativo,
      })) {
        return target.id === input.actorId ? "self_protected" : "last_admin";
      }

      await tx.usuario.update({ where: { id: target.id }, data: { ativo: input.ativo } });
      if (!input.ativo) await tx.sessaoAutenticacao.deleteMany({ where: { usuarioId: target.id } });
      return "changed";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return "conflict";
    throw error;
  }
}
