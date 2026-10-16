"use server";

import { redirect } from "next/navigation";
import { createDevMockSession, destroyDevMockSession, type DevMockProfile } from "@backend/auth/dev-mock";
import { isDevMockMode } from "@backend/lib/dev-mode";

const landingPage: Record<DevMockProfile, string> = {
  PARTICIPANTE: "/participante",
  ORGANIZADOR: "/organizador",
  ADMIN: "/admin",
  AVALIADOR: "/avaliador/trabalhos",
};

export async function loginAsDevMockAction(formData: FormData): Promise<void> {
  if (!isDevMockMode()) redirect("/login");
  const profile = formData.get("profile");
  if (profile !== "PARTICIPANTE" && profile !== "ORGANIZADOR" && profile !== "ADMIN" && profile !== "AVALIADOR") {
    redirect("/login?erro=invalid");
  }

  await createDevMockSession(profile);
  redirect(landingPage[profile]);
}

export async function logoutDevMockAction(): Promise<void> {
  if (isDevMockMode()) await destroyDevMockSession();
  redirect("/login?logout=ok");
}
