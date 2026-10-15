"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { consumeRateLimit } from "@backend/auth/rate-limit";
import { requestPasswordRecovery, resetPassword } from "@backend/auth/password-recovery-service";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const resetSchema = z.object({ token: z.string().min(40).max(60), password: z.string().min(12).max(128), confirmation: z.string() })
  .refine((data) => data.password === data.confirmation, { path: ["confirmation"] });

async function clientAddress() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-real-ip") ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function requestPasswordRecoveryAction(formData: FormData): Promise<void> {
  const address = await clientAddress();
  if (!consumeRateLimit(`password-recovery:${address}`, { limit: 5, windowMs: 15 * 60_000 }).allowed) redirect("/recuperar-senha?resultado=ok");
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (parsed.success) {
    const emailKey = createHash("sha256").update(parsed.data).digest("hex");
    if (consumeRateLimit(`password-recovery-email:${emailKey}`, { limit: 3, windowMs: 60 * 60_000 }).allowed) await requestPasswordRecovery(parsed.data);
  }
  redirect("/recuperar-senha?resultado=ok");
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const address = await clientAddress();
  if (!consumeRateLimit(`password-reset:${address}`, { limit: 10, windowMs: 15 * 60_000 }).allowed) redirect("/redefinir-senha?resultado=invalid");
  const parsed = resetSchema.safeParse({ token: formData.get("token"), password: formData.get("password"), confirmation: formData.get("confirmation") });
  if (!parsed.success) redirect("/redefinir-senha?resultado=invalid");
  const success = await resetPassword(parsed.data.token, parsed.data.password);
  redirect(success ? "/login?senha=alterada" : "/redefinir-senha?resultado=invalid");
}
