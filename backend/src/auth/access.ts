import "server-only";
import { redirect } from "next/navigation";
import type { PerfilUsuario } from "@prisma/client";
import { getCurrentUser } from "./session";
import { areaInicialDoPerfil, podeAcessarPerfil } from "./policy";

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: PerfilUsuario[]) {
  const user = await requireAuthenticatedUser();
  if (!podeAcessarPerfil(user.perfil, roles)) redirect(areaInicialDoPerfil(user.perfil));
  return user;
}

export const requireAdmin = () => requireRole("ADMIN");
export const requireOrganizer = () => requireRole("ORGANIZADOR");
