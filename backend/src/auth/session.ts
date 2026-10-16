import "server-only";
import { cookies } from "next/headers";
import { hashSessionToken, createSessionToken } from "./session-token";
import { destroyDevMockSession, DEV_MOCK_COOKIE, getDevMockUser } from "./dev-mock";
import { isDevMockMode } from "@backend/lib/dev-mode";

export const SESSION_COOKIE = DEV_MOCK_COOKIE;
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export async function createSession(usuarioId: string): Promise<void> {
  if (isDevMockMode()) throw new Error("Não é permitido criar sessões do banco no modo mock.");

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const { prisma } = await import("@backend/lib/prisma");
  await prisma.sessaoAutenticacao.create({ data: { tokenHash: hashSessionToken(token), usuarioId, expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getCurrentUser() {
  if (isDevMockMode()) return getDevMockUser();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { prisma } = await import("@backend/lib/prisma");
  const session = await prisma.sessaoAutenticacao.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      usuario: { select: { id: true, nome: true, email: true, perfil: true, ativo: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.usuario.ativo) {
    return null;
  }
  return session.usuario;
}

export async function destroyCurrentSession(): Promise<void> {
  if (isDevMockMode()) {
    await destroyDevMockSession();
    return;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const { prisma } = await import("@backend/lib/prisma");
    await prisma.sessaoAutenticacao.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}
