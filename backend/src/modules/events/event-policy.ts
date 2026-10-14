export type EventRole = "PARTICIPANTE" | "ORGANIZADOR" | "ADMIN" | "AVALIADOR";
export type EventPrincipal = { id: string; perfil: EventRole; ativo: boolean };

export function canManageEvents(actor: EventPrincipal): boolean {
  return actor.ativo && (actor.perfil === "ORGANIZADOR" || actor.perfil === "ADMIN");
}

export function canManageEvent(actor: EventPrincipal, organizadorId: string): boolean {
  return canManageEvents(actor) && (actor.perfil === "ADMIN" || actor.id === organizadorId);
}

const transitions: Record<string, readonly string[]> = {
  RASCUNHO: ["PUBLICADO", "CANCELADO"],
  PUBLICADO: ["CANCELADO", "ENCERRADO"],
  CANCELADO: [],
  ENCERRADO: [],
};

export function canTransitionEvent(current: string, target: string): boolean {
  return transitions[current]?.includes(target) ?? false;
}

export function isSessionWithinEvent(session: { inicio: Date; fim: Date }, event: { dataInicio: Date; dataTermino: Date }): boolean {
  return session.inicio >= event.dataInicio && session.fim <= event.dataTermino && session.fim > session.inicio;
}
