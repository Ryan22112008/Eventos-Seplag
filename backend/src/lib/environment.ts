import { z } from "zod";

export const environmentSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  BASE_URL: z.url().optional(),
  SEED_ADMIN_NAME: z.string().optional(),
  SEED_ADMIN_EMAIL: z.email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

export function validateEnvironment(environment: Readonly<Record<string, string | undefined>>) {
  return environmentSchema.parse(environment);
}
