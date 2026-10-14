import "server-only";
import { hash } from "argon2";
import { Prisma, PerfilUsuario, StatusSolicitacaoOrganizador } from "@prisma/client";
import type { CadastroInput } from "./schemas";
import { prisma } from "@backend/lib/prisma";

export async function registerAccount(input: CadastroInput) {
  const senhaHash = await hash(input.senha);
  return prisma.$transaction(async (tx) => {
    const user = await tx.usuario.create({
      data: { nome: input.nome, email: input.email, senhaHash, perfil: PerfilUsuario.PARTICIPANTE, ativo: true },
      select: { id: true, nome: true, email: true, perfil: true },
    });
    if (input.queroSerOrganizador) {
      await tx.solicitacaoOrganizador.create({
        data: { usuarioId: user.id, status: StatusSolicitacaoOrganizador.PENDENTE },
      });
    }
    return user;
  });
}

export async function requestOrganizerRole(usuarioId: string): Promise<"created" | "pending" | "approved" | "not_participant" | "conflict"> {
  try {
    return await prisma.$transaction(async (tx): Promise<"created" | "pending" | "approved" | "not_participant" | "conflict"> => {
      const user = await tx.usuario.findUnique({ where: { id: usuarioId }, select: { perfil: true, ativo: true } });
      if (!user?.ativo || user.perfil !== PerfilUsuario.PARTICIPANTE) return "not_participant";
      const pending = await tx.solicitacaoOrganizador.findFirst({
        where: { usuarioId, status: StatusSolicitacaoOrganizador.PENDENTE }, select: { id: true },
      });
      if (pending) return "pending";
      const latest = await tx.solicitacaoOrganizador.findFirst({
        where: { usuarioId }, orderBy: { createdAt: "desc" }, select: { status: true },
      });
      if (latest?.status === StatusSolicitacaoOrganizador.APROVADO) return "approved";
      await tx.solicitacaoOrganizador.create({ data: { usuarioId, status: StatusSolicitacaoOrganizador.PENDENTE } });
      return "created";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      const pending = await prisma.solicitacaoOrganizador.findFirst({
        where: { usuarioId, status: StatusSolicitacaoOrganizador.PENDENTE }, select: { id: true },
      });
      return pending ? "pending" : "conflict";
    }
    throw error;
  }
}
