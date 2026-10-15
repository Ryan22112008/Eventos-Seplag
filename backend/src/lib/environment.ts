import { z } from "zod";

export const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  BASE_URL: z.url().optional(),
  APP_URL: z.url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d*$/).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  SEED_ADMIN_NAME: z.string().optional(),
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  CERTIFICATE_INSTITUTION_NAME: z.string().trim().max(160).optional(),
  CERTIFICATE_TEXT: z.string().trim().max(1200).optional(),
  CERTIFICATE_LOGO_PATH: z.string().trim().optional(),
});

export function validateEnvironment(environment: Readonly<Record<string, string | undefined>>) {
  return environmentSchema.parse(environment);
}
