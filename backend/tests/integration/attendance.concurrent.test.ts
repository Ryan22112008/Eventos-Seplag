import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, PerfilUsuario, ModalidadeEvento, StatusEvento, StatusInscricao } from "@prisma/client";
import type { AttendanceActor } from "@backend/modules/attendance/attendance-service";
import { CHECKIN_TOKEN_TTL_MS, createCheckinToken, hashQrToken } from "@backend/modules/attendance/checkin-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) console.warn("Integração de presença ignorada: configure TEST_DATABASE_URL para um banco MySQL exclusivo de testes.");
const db = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const integration = databaseUrl ? describe : describe.skip;
type AttendanceService = typeof import("@backend/modules/attendance/attendance-service");
let service: AttendanceService | null = null;
let users: string[] = [];
let events: string[] = [];
let sessions: string[] = [];
let registrations: string[] = [];

async function createUser(perfil: PerfilUsuario): Promise<AttendanceActor> {
  if (!db) throw new Error("MySQL de integração não configurado.");
  const user = await db.usuario.create({ data: { nome: "Attendance test", email: `${randomUUID()}@example.test`, senhaHash: "test-only", perfil } });
  users.push(user.id);
  return { id: user.id, perfil: user.perfil, ativo: true };
}

async function createEventAndSession(organizer: AttendanceActor, options: { start?: Date; end?: Date } = {}) {
  if (!db) throw new Error("MySQL de integração não configurado.");
  const now = new Date();
  const event = await db.evento.create({ data: {
    titulo: "Evento de presença", descricao: "Teste de integração", dataInicio: new Date(now.getTime() - 60_000), dataTermino: new Date(now.getTime() + 30 * 60_000),
    modalidade: ModalidadeEvento.PRESENCIAL, nicho: "Teste", vagasTotais: 5, vagasRestantes: 5, cargaHoraria: 1,
    organizadorId: organizer.id, status: StatusEvento.PUBLICADO,
  } });
  events.push(event.id);
  const session = await db.sessao.create({ data: { eventoId: event.id, nome: "Sessão de teste", inicio: options.start ?? new Date(now.getTime() - 60_000), fim: options.end ?? new Date(now.getTime() + 10 * 60_000) } });
  sessions.push(session.id);
  return { event, session };
}

async function enroll(actor: AttendanceActor, eventId: string, status: StatusInscricao = StatusInscricao.ATIVA) {
  if (!db) throw new Error("MySQL de integração não configurado.");
  const record = await db.inscricao.create({ data: { participanteId: actor.id, eventoId: eventId, tokenIngresso: hashQrToken(randomUUID()), status } });
  registrations.push(record.id);
  return record;
}

beforeAll(async () => { if (db) { await db.$connect(); service = await import("@backend/modules/attendance/attendance-service"); } });
afterEach(async () => {
  if (!db) return;
  if (sessions.length) await db.presenca.deleteMany({ where: { sessaoId: { in: sessions } } });
  if (registrations.length) await db.inscricao.deleteMany({ where: { id: { in: registrations } } });
  if (sessions.length) await db.sessao.deleteMany({ where: { id: { in: sessions } } });
  if (events.length) await db.evento.deleteMany({ where: { id: { in: events } } });
  if (users.length) await db.usuario.deleteMany({ where: { id: { in: users } } });
  users = []; events = []; sessions = []; registrations = [];
});
afterAll(async () => { await db?.$disconnect(); });

integration("MySQL attendance and QR flow", () => {
  it("records one presence for two simultaneous requests from the same participant", async () => {
    const organizer = await createUser(PerfilUsuario.ORGANIZADOR);
    const participant = await createUser(PerfilUsuario.PARTICIPANTE);
    const { event, session } = await createEventAndSession(organizer);
    await enroll(participant, event.id);
    const qr = await service!.issueSessionCheckinToken(organizer, { eventoId: event.id, sessaoId: session.id }, db!);
    const attempts = await Promise.allSettled([
      service!.registerSessionPresence(participant, qr.token, db!),
      service!.registerSessionPresence(participant, qr.token, db!),
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(await db!.presenca.count({ where: { sessaoId: session.id, participanteId: participant.id } })).toBe(1);
  });

  it("allows two enrolled participants to check in concurrently for one session", async () => {
    const organizer = await createUser(PerfilUsuario.ORGANIZADOR);
    const participants = await Promise.all([createUser(PerfilUsuario.PARTICIPANTE), createUser(PerfilUsuario.PARTICIPANTE)]);
    const { event, session } = await createEventAndSession(organizer);
    for (const participant of participants) await enroll(participant, event.id);
    const qr = await service!.issueSessionCheckinToken(organizer, { eventoId: event.id, sessaoId: session.id }, db!);
    const attempts = await Promise.all(participants.map((participant) => service!.registerSessionPresence(participant, qr.token, db!)));
    expect(attempts.every((attempt) => attempt.state === "registered")).toBe(true);
    expect(await db!.presenca.count({ where: { sessaoId: session.id } })).toBe(2);
  });

  it("invalidates the previous QR token after rotation", async () => {
    const organizer = await createUser(PerfilUsuario.ORGANIZADOR);
    const participant = await createUser(PerfilUsuario.PARTICIPANTE);
    const { event, session } = await createEventAndSession(organizer);
    await enroll(participant, event.id);
    const ids = { eventoId: event.id, sessaoId: session.id };
    const oldQr = await service!.issueSessionCheckinToken(organizer, ids, db!);
    const newQr = await service!.issueSessionCheckinToken(organizer, ids, db!);
    await expect(service!.registerSessionPresence(participant, oldQr.token, db!)).rejects.toMatchObject({ code: "TOKEN_INVALID" });
    await expect(service!.registerSessionPresence(participant, newQr.token, db!)).resolves.toMatchObject({ state: "registered" });
  });

  it("rejects expired tokens and check-ins outside the session window", async () => {
    const organizer = await createUser(PerfilUsuario.ORGANIZADOR);
    const participant = await createUser(PerfilUsuario.PARTICIPANTE);
    const { event, session } = await createEventAndSession(organizer);
    await enroll(participant, event.id);
    const expired = createCheckinToken(session.id, new Date(Date.now() - CHECKIN_TOKEN_TTL_MS - 10_000));
    await db!.sessao.update({ where: { id: session.id }, data: { tokenQr: hashQrToken(expired.token) } });
    await expect(service!.registerSessionPresence(participant, expired.token, db!)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
    const { event: futureEvent, session: futureSession } = await createEventAndSession(organizer, { start: new Date(Date.now() + 5 * 60_000), end: new Date(Date.now() + 15 * 60_000) });
    await enroll(participant, futureEvent.id);
    const futureQr = await service!.issueSessionCheckinToken(organizer, { eventoId: futureEvent.id, sessaoId: futureSession.id }, db!);
    await expect(service!.registerSessionPresence(participant, futureQr.token, db!)).rejects.toMatchObject({ code: "SESSION_NOT_OPEN" });
  });

  it("rejects canceled enrollment, wrong-event enrollment, and an inactive participant", async () => {
    const organizer = await createUser(PerfilUsuario.ORGANIZADOR);
    const participant = await createUser(PerfilUsuario.PARTICIPANTE);
    const { event, session } = await createEventAndSession(organizer);
    const canceled = await enroll(participant, event.id, StatusInscricao.CANCELADA);
    const qr = await service!.issueSessionCheckinToken(organizer, { eventoId: event.id, sessaoId: session.id }, db!);
    await expect(service!.registerSessionPresence(participant, qr.token, db!)).rejects.toMatchObject({ code: "NOT_ENROLLED" });
    await db!.inscricao.update({ where: { id: canceled.id }, data: { status: StatusInscricao.ATIVA } });
    const other = await createEventAndSession(organizer);
    await enroll(participant, other.event.id);
    await expect(service!.registerSessionPresence(participant, qr.token, db!)).rejects.toMatchObject({ code: "NOT_ENROLLED" });
    await expect(service!.registerSessionPresence({ ...participant, ativo: false }, qr.token, db!)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("issues a ticket token only to its active owner and persists only the hash", async () => {
    const organizer = await createUser(PerfilUsuario.ORGANIZADOR);
    const owner = await createUser(PerfilUsuario.PARTICIPANTE);
    const outsider = await createUser(PerfilUsuario.PARTICIPANTE);
    const { event } = await createEventAndSession(organizer);
    const registration = await enroll(owner, event.id);
    await expect(service!.issueOwnTicketToken(outsider, registration.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const token = await service!.issueOwnTicketToken(owner, registration.id, db!);
    const saved = await db!.inscricao.findUniqueOrThrow({ where: { id: registration.id }, select: { tokenIngresso: true } });
    expect(saved.tokenIngresso).toBe(hashQrToken(token));
    expect(saved.tokenIngresso).not.toBe(token);
    await db!.inscricao.update({ where: { id: registration.id }, data: { status: StatusInscricao.CANCELADA } });
    await expect(service!.issueOwnTicketToken(owner, registration.id, db!)).rejects.toMatchObject({ code: "TICKET_CANCELLED" });
  });

  it("prevents an organizer from rotating a QR for another organizer's event while ADMIN can", async () => {
    const owner = await createUser(PerfilUsuario.ORGANIZADOR);
    const outsider = await createUser(PerfilUsuario.ORGANIZADOR);
    const admin = await createUser(PerfilUsuario.ADMIN);
    const { event, session } = await createEventAndSession(owner);
    const ids = { eventoId: event.id, sessaoId: session.id };
    await expect(service!.issueSessionCheckinToken(outsider, ids, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service!.issueSessionCheckinToken(admin, ids, db!)).resolves.toHaveProperty("token");
  });
});
