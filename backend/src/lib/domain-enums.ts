export const perfilUsuario = ["PARTICIPANTE", "ORGANIZADOR", "ADMIN", "AVALIADOR"] as const;
export const modalidadeEvento = ["PRESENCIAL", "ONLINE", "HIBRIDO"] as const;
export const statusEvento = ["RASCUNHO", "PUBLICADO", "CANCELADO", "ENCERRADO"] as const;
export const statusInscricao = ["ATIVA", "CANCELADA", "CONCLUIDA"] as const;
export const statusPresenca = ["PRESENTE", "FALTA", "JUSTIFICADA"] as const;
export const statusTrabalho = ["SUBMETIDO", "EM_AVALIACAO", "APROVADO", "REJEITADO"] as const;
export function isDomainEnumValue<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.some((candidate) => candidate === value);
}
