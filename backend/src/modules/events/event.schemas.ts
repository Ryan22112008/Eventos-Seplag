import { z } from "zod";

const nullableText = (max: number) => z.union([z.string().trim().max(max), z.null()]);
const requiredNumber = z.preprocess((value) => value === "" || value === undefined ? Number.NaN : value, z.coerce.number().finite());
const optionalCoordinate = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce.number().finite().nullable(),
);

export const eventInputSchema = z.object({
  titulo: z.string().trim().min(1).max(240),
  descricao: z.string().trim().min(1).max(20_000),
  dataInicio: z.coerce.date(),
  dataTermino: z.coerce.date(),
  local: nullableText(300),
  cidade: nullableText(160),
  urlGoogleMaps: z.union([z.literal(""), z.url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Informe uma URL HTTP ou HTTPS válida.")]).transform((value) => value === "" ? null : value),
  latitude: optionalCoordinate.refine((value) => value === null || (value >= -90 && value <= 90), "Latitude deve estar entre -90 e 90."),
  longitude: optionalCoordinate.refine((value) => value === null || (value >= -180 && value <= 180), "Longitude deve estar entre -180 e 180."),
  modalidade: z.enum(["PRESENCIAL", "ONLINE", "HIBRIDO"]),
  nicho: z.string().trim().min(1).max(120),
  vagasTotais: requiredNumber.pipe(z.number().int().min(0).max(1_000_000)),
  cargaHoraria: requiredNumber.pipe(z.number().positive().max(10_000)),
  percentualMinimoPresenca: requiredNumber.pipe(z.number().min(0).max(100)),
  aceitaSubmissaoTrabalhos: z.boolean(),
}).refine((data) => data.dataTermino > data.dataInicio, {
  path: ["dataTermino"], message: "O término deve ser posterior ao início.",
});

export const eventIdSchema = z.uuid();
export const eventTransitionSchema = z.object({ eventoId: z.uuid(), status: z.enum(["PUBLICADO", "CANCELADO", "ENCERRADO"]) });
export const disciplinaInputSchema = z.object({ nome: z.string().trim().min(1).max(180), cargaHoraria: z.coerce.number().finite().positive().max(10_000) });
export const disciplinaIdSchema = z.object({ eventoId: z.uuid(), disciplinaId: z.uuid() });
export const sessaoInputSchema = z.object({
  nome: z.string().trim().min(1).max(180),
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
}).refine((data) => data.fim > data.inicio, { path: ["fim"], message: "O fim deve ser posterior ao início." });
export const sessaoIdSchema = z.object({ eventoId: z.uuid(), sessaoId: z.uuid() });
export const assetNameSchema = z.enum(["banner", "arteCertificadoFrente", "arteCertificadoVerso"]);

export type EventInput = z.infer<typeof eventInputSchema>;
