export type ParticipationSituation = "EM_ANDAMENTO" | "CONCLUIDO" | "NAO_CONCLUIDO";
export type AttendancePresence = { sessaoId: string; status: "PRESENTE" | "FALTA" | "JUSTIFICADA" };

export type AttendanceSummaryInput = {
  sessionIds: readonly string[];
  presences: readonly AttendancePresence[];
  minimumPercentage: number | string;
  eventStatus: "RASCUNHO" | "PUBLICADO" | "CANCELADO" | "ENCERRADO";
  registrationStatus: "ATIVA" | "CANCELADA" | "CONCLUIDA";
};

export type AttendanceSummary = {
  totalSessoes: number;
  sessoesPresentes: number;
  sessoesAusentes: number;
  percentualFrequencia: number;
  situacao: ParticipationSituation;
  elegivel: boolean;
};

function percentageHundredths(value: number | string): number {
  const normalized = String(value).trim();
  if (!/^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/.test(normalized)) {
    throw new RangeError("O percentual mínimo deve estar entre 0 e 100, com até duas casas decimais.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

export function calculateAttendanceSummary(input: AttendanceSummaryInput): AttendanceSummary {
  const minimum = percentageHundredths(input.minimumPercentage);
  const sessionIds = new Set(input.sessionIds);
  const totalSessoes = sessionIds.size;
  const presentSessionIds = new Set(
    input.presences
      .filter((presence) => presence.status === "PRESENTE" && sessionIds.has(presence.sessaoId))
      .map((presence) => presence.sessaoId),
  );
  const sessoesPresentes = presentSessionIds.size;
  const percentualFrequencia = totalSessoes === 0 ? 0 : Math.round((sessoesPresentes / totalSessoes) * 10_000) / 100;
  const enrolled = input.registrationStatus === "ATIVA" || input.registrationStatus === "CONCLUIDA";
  const eligible = enrolled && input.eventStatus === "ENCERRADO" && totalSessoes > 0
    && sessoesPresentes * 10_000 >= minimum * totalSessoes;
  const situacao: ParticipationSituation = !enrolled || input.eventStatus === "CANCELADO"
    ? "NAO_CONCLUIDO"
    : input.eventStatus !== "ENCERRADO"
      ? "EM_ANDAMENTO"
      : eligible ? "CONCLUIDO" : "NAO_CONCLUIDO";

  return {
    totalSessoes,
    sessoesPresentes,
    sessoesAusentes: totalSessoes - sessoesPresentes,
    percentualFrequencia,
    situacao,
    elegivel: eligible,
  };
}
