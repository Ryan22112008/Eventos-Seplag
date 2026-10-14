import { describe, expect, it } from "vitest";
import { CHECKIN_TOKEN_TTL_MS, createCheckinToken, createTicketToken, hashQrToken, matchesQrToken, parseCheckinToken } from "@backend/modules/attendance/checkin-token";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";

describe("QR credentials", () => {
  it("creates cryptographically random, expiring session tokens and verifies only their hashes", () => {
    const issued = new Date("2030-01-01T12:00:00.000Z");
    const first = createCheckinToken(sessionId, issued);
    const second = createCheckinToken(sessionId, issued);
    expect(first.expiresAt.getTime() - issued.getTime()).toBe(CHECKIN_TOKEN_TTL_MS);
    expect(first.token).not.toBe(second.token);
    expect(parseCheckinToken(first.token)).toEqual({ sessionId, expiresAt: first.expiresAt });
    expect(matchesQrToken(first.token, hashQrToken(first.token))).toBe(true);
    expect(matchesQrToken(second.token, hashQrToken(first.token))).toBe(false);
    expect(matchesQrToken(first.token, null)).toBe(false);
  });

  it("rejects malformed QR payloads and produces opaque ticket secrets", () => {
    expect(parseCheckinToken("not-a-checkin-code")).toBeNull();
    const ticket = createTicketToken();
    expect(ticket).toMatch(/^SEPLAG-TICKET\.v1\.[A-Za-z0-9_-]{43}$/);
    expect(ticket).not.toContain(sessionId);
  });
});
