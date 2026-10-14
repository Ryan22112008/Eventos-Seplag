import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const CHECKIN_TOKEN_TTL_MS = 2 * 60 * 1000;
const uuid = z.uuid();
const tokenPattern = /^SEPLAG-CHECKIN\.v1\.([0-9a-f-]{36})\.(\d{13})\.([A-Za-z0-9_-]{43})$/;

export const checkinTokenSchema = z.string().min(100).max(150).regex(tokenPattern);

export type ParsedCheckinToken = { sessionId: string; expiresAt: Date };

export function createCheckinToken(sessionId: string, issuedAt: Date): { token: string; expiresAt: Date } {
  const expiresAt = new Date(issuedAt.getTime() + CHECKIN_TOKEN_TTL_MS);
  return { token: `SEPLAG-CHECKIN.v1.${sessionId}.${expiresAt.getTime()}.${randomBytes(32).toString("base64url")}`, expiresAt };
}

export function parseCheckinToken(rawToken: unknown): ParsedCheckinToken | null {
  const parsed = checkinTokenSchema.safeParse(rawToken);
  if (!parsed.success) return null;
  const match = tokenPattern.exec(parsed.data);
  if (!match || !uuid.safeParse(match[1]).success) return null;
  const expiry = Number(match[2]);
  if (!Number.isSafeInteger(expiry)) return null;
  return { sessionId: match[1], expiresAt: new Date(expiry) };
}

export function hashQrToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function matchesQrToken(token: string, storedHash: string | null): boolean {
  if (!storedHash || !/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  const expected = Buffer.from(storedHash, "hex");
  const received = Buffer.from(hashQrToken(token), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function createTicketToken(): string {
  return `SEPLAG-TICKET.v1.${randomBytes(32).toString("base64url")}`;
}
