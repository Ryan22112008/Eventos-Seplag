import { z } from "zod";

const normalizedEmail = z.string().trim().toLowerCase().pipe(z.email());

export const cadastroSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  email: normalizedEmail,
  senha: z.string().min(12).max(128),
  confirmarSenha: z.string(),
  queroSerOrganizador: z.boolean(),
}).refine((data) => data.senha === data.confirmarSenha, {
  path: ["confirmarSenha"],
  message: "As senhas não coincidem.",
});

export const loginSchema = z.object({ email: normalizedEmail, senha: z.string().min(1).max(128) });
export const solicitacaoOrganizadorSchema = z.object({ intent: z.literal("request") });
export const decisaoOrganizadorSchema = z.object({ solicitacaoId: z.uuid() });
export const alteracaoAtivoSchema = z.object({
  usuarioId: z.uuid(),
  ativo: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
