import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@backend/lib/prisma";
import { hashSessionToken, createSessionToken } from "./session-token";

export const SESSION_COOKIE = "eventos_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export async function createSession(usuarioId: string): Promise<void> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await prisma.sessaoAutenticacao.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  cookieStore.delete(SESSION_COOKIE);
}
