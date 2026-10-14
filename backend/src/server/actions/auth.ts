"use server";

import { Prisma } from "@prisma/client";
import { verify } from "argon2";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@backend/lib/prisma";
import { registerAccount, requestOrganizerRole } from "@backend/auth/account-service";
import { cadastroSchema, loginSchema, solicitacaoOrganizadorSchema } from "@backend/auth/schemas";
import { createSession, destroyCurrentSession } from "@backend/auth/session";
import { requireRole } from "@backend/auth/access";
import { consumeRateLimit, resetRateLimit } from "@backend/auth/rate-limit";

const RATE_WINDOW_MS = 15 * 60 * 1000;

async function clientKey(scope: "login" | "cadastro") {
  const requestHeaders = await headers();
  const address = requestHeaders.get("x-real-ip")
    ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  return `${scope}:${address}`;
}

export async function registerAction(formData: FormData): Promise<void> {
  const key = await clientKey("cadastro");
  if (!consumeRateLimit(key, { limit: 5, windowMs: RATE_WINDOW_MS }).allowed) redirect("/cadastro?erro=rate");

  const parsed = cadastroSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
    queroSerOrganizador: formData.get("queroSerOrganizador") === "on",
  });
  if (!parsed.success) redirect("/cadastro?erro=invalid");

  let user: Awaited<ReturnType<typeof registerAccount>>;
  try {
    user = await registerAccount(parsed.data);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/cadastro?erro=unavailable");
    }
    throw error;
  }
  await createSession(user.id);
  resetRateLimit(key);
  redirect("/participante?cadastro=ok");
}

export async function loginAction(formData: FormData): Promise<void> {
  const key = await clientKey("login");
  if (!consumeRateLimit(key, { limit: 10, windowMs: RATE_WINDOW_MS }).allowed) redirect("/login?erro=rate");
  const parsed = loginSchema.safeParse({ email: formData.get("email"), senha: formData.get("senha") });
  if (!parsed.success) redirect("/login?erro=invalid");

  const user = await prisma.usuario.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, perfil: true, ativo: true, senhaHash: true },
  });
  let senhaValida = false;
  if (user) {
    try { senhaValida = await verify(user.senhaHash, parsed.data.senha); } catch { senhaValida = false; }
  }
  if (!user || !user.ativo || !senhaValida) redirect("/login?erro=invalid");

  await createSession(user.id);
  resetRateLimit(key);
  switch (user.perfil) {
    case "ADMIN": redirect("/admin");
    case "ORGANIZADOR": redirect("/organizador");
    case "PARTICIPANTE": redirect("/participante");
    default: redirect("/");
  }
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login?logout=ok");
}

export async function requestOrganizerAction(formData: FormData): Promise<void> {
  const user = await requireRole("PARTICIPANTE");
  const parsed = solicitacaoOrganizadorSchema.safeParse({ intent: formData.get("intent") });
  if (!parsed.success) redirect("/participante?solicitacao=erro");
  const result = await requestOrganizerRole(user.id);
  redirect(`/participante?solicitacao=${result}`);
}
