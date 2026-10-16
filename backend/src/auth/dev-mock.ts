import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isDevMockMode } from "@backend/lib/dev-mode";

export const DEV_MOCK_COOKIE = "eventos_session";
export const DEV_MOCK_SESSION_DURATION_SECONDS = 60 * 60 * 24;

export const DEV_MOCK_PROFILES = {
  PARTICIPANTE: {
    id: "dev-participante",
    nome: "Mariana Oliveira Santos",
    email: "mariana.santos@demo.local",
    perfil: "PARTICIPANTE",
    ativo: true,
    instituicao: "SEPLAG-MT",
    cargo: "Analista Administrativa",
    cidade: "Cuiabá - MT",
    telefone: "+55 65 9 9999-0000",
    criadoEm: new Date("2026-01-15T09:00:00"),
  },
  ORGANIZADOR: {
    id: "dev-organizador",
    nome: "Organizador de demonstração",
    email: "organizador.dev@local.test",
    perfil: "ORGANIZADOR",
    ativo: true,
  },
  ADMIN: {
    id: "dev-admin",
    nome: "Administrador de demonstração",
    email: "admin.dev@local.test",
    perfil: "ADMIN",
    ativo: true,
  },
  AVALIADOR: {
    id: "dev-avaliador",
    nome: "Avaliador de demonstração",
    email: "avaliador.dev@local.test",
    perfil: "AVALIADOR",
    ativo: true,
  },
} as const;

export type DevMockProfile = keyof typeof DEV_MOCK_PROFILES;
export type DevMockUser = (typeof DEV_MOCK_PROFILES)[DevMockProfile];

export function isDevMockProfile(profile: unknown): profile is DevMockProfile {
  return typeof profile === "string" && Object.hasOwn(DEV_MOCK_PROFILES, profile);
}

const globalForDevMock = globalThis as typeof globalThis & { devMockSigningSecret?: string };

function signingSecret(): string {
  globalForDevMock.devMockSigningSecret ??= randomBytes(32).toString("base64url");
  return globalForDevMock.devMockSigningSecret;
}

function signature(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export async function createDevMockSession(profile: DevMockProfile): Promise<void> {
  if (!isDevMockMode()) throw new Error("A sessão mock está desativada neste ambiente.");

  const expiresAt = Date.now() + DEV_MOCK_SESSION_DURATION_SECONDS * 1000;
  const payload = Buffer.from(`${profile}:${expiresAt}:${randomBytes(18).toString("base64url")}`).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(DEV_MOCK_COOKIE, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
    maxAge: DEV_MOCK_SESSION_DURATION_SECONDS,
  });
}

export async function getDevMockUser(): Promise<DevMockUser | null> {
  if (!isDevMockMode()) return null;
  const token = (await cookies()).get(DEV_MOCK_COOKIE)?.value;
  if (!token) return null;

  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra !== undefined) return null;

  const expectedSignature = signature(payload);
  const providedBytes = Buffer.from(providedSignature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) return null;

  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const match = /^([A-Z]+):(\d+):[A-Za-z0-9_-]+$/.exec(decoded);
  if (!match || Number(match[2]) <= Date.now() || !isDevMockProfile(match[1])) return null;
  return DEV_MOCK_PROFILES[match[1]];
}

export async function destroyDevMockSession(): Promise<void> {
  (await cookies()).delete(DEV_MOCK_COOKIE);
}
