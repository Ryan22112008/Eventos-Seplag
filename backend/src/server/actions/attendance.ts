"use server";

import { requireRole } from "@backend/auth/access";
import { consumeRateLimit } from "@backend/auth/rate-limit";
import { AttendanceError, issueOwnTicketToken, issueSessionCheckinToken, registerSessionPresence } from "@backend/modules/attendance/attendance-service";
import { checkinInputSchema, organizerSessionSchema, ticketIdSchema } from "@backend/modules/attendance/attendance.schemas";
import { isDevMockMode } from "@backend/lib/dev-mode";

export async function issueTicketQrAction(registrationId: string) {
  if (isDevMockMode()) {
    return { ok: true as const, token: `dev-ticket-${registrationId}` };
  }
  const actor = await requireRole("PARTICIPANTE");
  const id = ticketIdSchema.safeParse(registrationId);
  if (!id.success) return { ok: false as const, code: "not_found" };
  if (!consumeRateLimit(`ticket-qr:${actor.id}`, { limit: 8, windowMs: 10 * 60_000 }).allowed) return { ok: false as const, code: "rate_limited" };
  try { return { ok: true as const, token: await issueOwnTicketToken(actor, id.data) }; }
  catch (error) { return { ok: false as const, code: error instanceof AttendanceError ? error.code.toLowerCase() : "unavailable" }; }
}

export async function rotateSessionQrAction(rawIds: { eventoId: string; sessaoId: string }) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  const ids = organizerSessionSchema.safeParse(rawIds);
  if (!ids.success) return { ok: false as const, code: "invalid_input" };
  if (!consumeRateLimit(`session-qr:${actor.id}`, { limit: 10, windowMs: 10 * 60_000 }).allowed) return { ok: false as const, code: "rate_limited" };
  try { const qr = await issueSessionCheckinToken(actor, ids.data); return { ok: true as const, token: qr.token, expiresAtMs: qr.expiresAt.getTime(), sessionName: qr.sessionName }; }
  catch (error) { return { ok: false as const, code: error instanceof AttendanceError ? error.code.toLowerCase() : "unavailable" }; }
}

export async function checkInWithQrAction(rawToken: string) {
  const actor = await requireRole("PARTICIPANTE");
  const token = checkinInputSchema.safeParse(rawToken);
  if (!token.success) return { ok: false as const, code: "token_invalid" };
  if (!consumeRateLimit(`checkin:${actor.id}`, { limit: 20, windowMs: 5 * 60_000 }).allowed) return { ok: false as const, code: "rate_limited" };
  try { return { ok: true as const, ...await registerSessionPresence(actor, token.data) }; }
  catch (error) { return { ok: false as const, code: error instanceof AttendanceError ? error.code.toLowerCase() : "unavailable" }; }
}

