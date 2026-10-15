import "server-only";
import { randomBytes } from "node:crypto";
import { hash } from "argon2";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { applicationLink, sendEmail } from "@backend/lib/email/email-service";
import { hashRecoveryToken } from "./recovery-token";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,60}$/;

export async function requestPasswordRecovery(email: string) {
  try {
    const user = await prisma.usuario.findFirst({ where: { email: email.toLowerCase(), ativo: true }, select: { id: true, nome: true, email: true } });
    if (!user) return;
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashRecoveryToken(token);
    await prisma.$transaction(async (tx) => {
      await tx.tokenRecuperacaoSenha.deleteMany({ where: { usuarioId: user.id } });
      await tx.tokenRecuperacaoSenha.create({ data: { tokenHash, usuarioId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } });
    });
    const resetLink = applicationLink(`/redefinir-senha?token=${encodeURIComponent(token)}`, "Redefinir senha");
    if (!resetLink) {
      console.error("Recuperação de senha indisponível: APP_URL não está configurada.");
      return;
    }
    await sendEmail(user.email, {
      subject: "Redefinição de senha",
      title: "Redefina sua senha",
      paragraphs: [`Olá, ${user.nome}. Recebemos uma solicitação para redefinir sua senha. O link expira em 30 minutos e pode ser usado uma única vez.`, "Se você não solicitou a redefinição, ignore este e-mail."],
      link: resetLink,
    });
  } catch (error) {
    console.error("Falha ao processar solicitação de recuperação de senha.", { error: error instanceof Error ? error.name : "UnknownError" });
  }
}

export async function resetPassword(token: string, password: string, client: PrismaClient = prisma): Promise<boolean> {
  if (!TOKEN_PATTERN.test(token)) return false;
  const tokenHash = hashRecoveryToken(token);
  try {
    const candidate = await client.tokenRecuperacaoSenha.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } }, select: { id: true } });
    if (!candidate) return false;
    const passwordHash = await hash(password);
    return await client.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; usuario_id: string; expires_at: Date }>>`
        SELECT \`id\`, \`usuario_id\`, \`expires_at\` FROM \`tokens_recuperacao_senha\` WHERE \`token_hash\` = ${tokenHash} FOR UPDATE`;
      const recovery = rows[0];
      if (!recovery || recovery.expires_at <= new Date()) return false;
      const removed = await tx.tokenRecuperacaoSenha.deleteMany({ where: { id: recovery.id, tokenHash } });
      if (removed.count !== 1) return false;
      await tx.usuario.update({ where: { id: recovery.usuario_id }, data: { senhaHash: passwordHash } });
      await tx.tokenRecuperacaoSenha.deleteMany({ where: { usuarioId: recovery.usuario_id } });
      await tx.sessaoAutenticacao.deleteMany({ where: { usuarioId: recovery.usuario_id } });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    console.error("Falha ao concluir recuperação de senha.", { error: error instanceof Error ? error.name : "UnknownError" });
    return false;
  }
}
