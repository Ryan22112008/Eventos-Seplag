import { z } from "zod";

const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Informe uma data válida.").transform((value) => new Date(`${value}T00:00:00.000Z`));

export const publicEventQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  nicho: z.string().trim().max(120).optional(),
  modalidade: z.enum(["PRESENCIAL", "ONLINE", "HIBRIDO"]).optional(),
  cidade: z.string().trim().max(160).optional(),
  futuro: z.enum(["true", "false"]).optional(),
  dataDe: dateParam.optional(),
  dataAte: dateParam.optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
}).refine((value) => !value.dataDe || !value.dataAte || value.dataDe <= value.dataAte, {
  path: ["dataAte"], message: "A data final deve ser posterior à inicial.",
});

export function parsePublicEventSearchParams(params: Record<string, string | string[] | undefined>) {
  const values: Record<string, string> = {};
  for (const key of ["q", "nicho", "modalidade", "cidade", "futuro", "dataDe", "dataAte", "page", "pageSize"]) {
    const value = params[key];
    if (typeof value === "string") values[key] = value;
  }
  return publicEventQuerySchema.safeParse(values);
}
