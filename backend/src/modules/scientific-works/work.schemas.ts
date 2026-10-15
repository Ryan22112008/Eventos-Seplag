import { z } from "zod";

export const workIdSchema = z.uuid();
export const workSubmissionSchema = z.object({
  eventoId: z.uuid(),
  titulo: z.string().trim().min(5).max(300),
  resumo: z.string().trim().min(30).max(20_000),
});
export const workStatusFilterSchema = z.enum(["TODOS", "SUBMETIDO", "EM_AVALIACAO", "APROVADO", "REJEITADO"]).default("TODOS");
export const reviewerAssignmentSchema = z.object({ trabalhoId: z.uuid(), avaliadorId: z.uuid() });
export const evaluationSchema = z.object({
  trabalhoId: z.uuid(),
  resultado: z.enum(["APROVADO", "REJEITADO"]),
  parecer: z.string().trim().min(20).max(10_000),
});

export type WorkSubmissionInput = z.infer<typeof workSubmissionSchema>;
