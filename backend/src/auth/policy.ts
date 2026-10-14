import type { PerfilUsuario } from "@prisma/client";

const areaPorPerfil: Record<PerfilUsuario, string> = {
  PARTICIPANTE: "/participante",
  ORGANIZADOR: "/organizador",
  ADMIN: "/admin",
  AVALIADOR: "/",
};

export function areaInicialDoPerfil(perfil: PerfilUsuario): string {
  return areaPorPerfil[perfil];
}

export function podeAcessarPerfil(perfil: PerfilUsuario, permitidos: readonly PerfilUsuario[]): boolean {
  return permitidos.includes(perfil);
}

export function podeDesativarUsuario(input: {
  atorId: string;
  alvoId: string;
  alvoAtivo: boolean;
  alvoEhAdmin: boolean;
  quantidadeAdminsAtivos: number;
  ativoDesejado: boolean;
}): boolean {
  if (input.ativoDesejado || !input.alvoAtivo) return true;
  if (input.atorId === input.alvoId) return false;
  if (input.alvoEhAdmin && input.quantidadeAdminsAtivos <= 1) return false;
  return true;
}
