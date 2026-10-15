import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient, PerfilUsuario, ModalidadeEvento, StatusEvento, StatusInscricao, StatusPresenca, StatusTrabalhoCientifico } from "@prisma/client";
import { verify } from "argon2";
import { hashRecoveryToken } from "@backend/auth/recovery-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) console.warn("Integração da Etapa 8 ignorada: configure TEST_DATABASE_URL para um banco MySQL exclusivo de testes.");
const db = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const integration = databaseUrl ? describe : describe.skip;
type RecoveryService = typeof import("@backend/auth/password-recovery-service");
type MetricsService = typeof import("@backend/modules/events/event-metrics-service");
let recoveryService: RecoveryService | null = null;
let metricsService: MetricsService | null = null;
let createdUserIds: string[] = [];
let createdEventIds: string[] = [];
let createdSessionIds: string[] = [];
let createdRegistrationIds: string[] = [];
let createdPresenceIds: string[] = [];
let createdWorkIds: string[] = [];

beforeAll(async () => {
  if (db) {
    await db.$connect();
    recoveryService = await import("@backend/auth/password-recovery-service");
    metricsService = await import("@backend/modules/events/event-metrics-service");
  }
});
afterEach(async () => {
  if (!db) return;
  if (createdPresenceIds.length) await db.presenca.deleteMany({ where: { id: { in: createdPresenceIds } } });
  if (createdRegistrationIds.length) await db.inscricao.deleteMany({ where: { id: { in: createdRegistrationIds } } });
  if (createdWorkIds.length) await db.trabalhoCientifico.deleteMany({ where: { id: { in: createdWorkIds } } });
  if (createdSessionIds.length) await db.sessao.deleteMany({ where: { id: { in: createdSessionIds } } });
  if (createdEventIds.length) await db.evento.deleteMany({ where: { id: { in: createdEventIds } } });
  if (createdUserIds.length) await db.usuario.deleteMany({ where: { id: { in: createdUserIds } } });
  createdPresenceIds = []; createdRegistrationIds = []; createdWorkIds = []; createdSessionIds = []; createdEventIds = []; createdUserIds = [];
});
afterAll(async () => { await db?.$disconnect(); });

integration("MySQL recovery and event metrics", () => {
  it("uses a recovery token once, hashes the new password, and revokes sessions", async () => {
    const user = await db!.usuario.create({ data: { nome: "Recovery test", email: `${randomUUID()}@example.test`, senhaHash: "old-hash" } });
    createdUserIds.push(user.id);
    const token = randomBytes(32).toString("base64url");
    await db!.tokenRecuperacaoSenha.create({ data: { usuarioId: user.id, tokenHash: hashRecoveryToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
    await db!.sessaoAutenticacao.create({ data: { usuarioId: user.id, tokenHash: randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 60_000) } });

    expect(await recoveryService!.resetPassword(token, "new-secure-password-2026", db!)).toBe(true);
    expect(await db!.sessaoAutenticacao.count({ where: { usuarioId: user.id } })).toBe(0);
    expect(await db!.tokenRecuperacaoSenha.count({ where: { usuarioId: user.id } })).toBe(0);
    expect(await recoveryService!.resetPassword(token, "another-secure-password-2026", db!)).toBe(false);
    const passwordHash = (await db!.usuario.findUniqueOrThrow({ where: { id: user.id }, select: { senhaHash: true } })).senhaHash;
    expect(passwordHash).not.toBe("old-hash");
    expect(await verify(passwordHash, "new-secure-password-2026")).toBe(true);
  });

  it("rejects expired recovery tokens", async () => {
    const user = await db!.usuario.create({ data: { nome: "Expired recovery test", email: `${randomUUID()}@example.test`, senhaHash: "old-hash" } });
    createdUserIds.push(user.id);
    const token = randomBytes(32).toString("base64url");
    await db!.tokenRecuperacaoSenha.create({ data: { usuarioId: user.id, tokenHash: hashRecoveryToken(token), expiresAt: new Date(Date.now() - 60_000) } });
    expect(await recoveryService!.resetPassword(token, "new-secure-password-2026", db!)).toBe(false);
  });

  it("returns event counts to the owner and rejects another organizer", async () => {
    const owner = await db!.usuario.create({ data: { nome: "Owner", email: `${randomUUID()}@example.test`, senhaHash: "test", perfil: PerfilUsuario.ORGANIZADOR } });
    const outsider = await db!.usuario.create({ data: { nome: "Outsider", email: `${randomUUID()}@example.test`, senhaHash: "test", perfil: PerfilUsuario.ORGANIZADOR } });
    const attendee = await db!.usuario.create({ data: { nome: "Attendee", email: `${randomUUID()}@example.test`, senhaHash: "test" } });
    const cancelled = await db!.usuario.create({ data: { nome: "Cancelled", email: `${randomUUID()}@example.test`, senhaHash: "test" } });
    createdUserIds.push(owner.id, outsider.id, attendee.id, cancelled.id);
    const event = await db!.evento.create({ data: { titulo: "Metrics test", descricao: "Test", dataInicio: new Date(Date.now() - 60_000), dataTermino: new Date(Date.now() + 3_600_000), modalidade: ModalidadeEvento.PRESENCIAL, nicho: "Test", vagasTotais: 4, vagasRestantes: 2, cargaHoraria: 1, organizadorId: owner.id, status: StatusEvento.PUBLICADO } });
    createdEventIds.push(event.id);
    const session = await db!.sessao.create({ data: { eventoId: event.id, nome: "Session", inicio: new Date(Date.now() - 30_000), fim: new Date(Date.now() + 30_000) } });
    createdSessionIds.push(session.id);
    const activeRegistration = await db!.inscricao.create({ data: { participanteId: attendee.id, eventoId: event.id, tokenIngresso: randomBytes(32).toString("hex"), status: StatusInscricao.ATIVA } });
    const cancelledRegistration = await db!.inscricao.create({ data: { participanteId: cancelled.id, eventoId: event.id, tokenIngresso: randomBytes(32).toString("hex"), status: StatusInscricao.CANCELADA } });
    createdRegistrationIds.push(activeRegistration.id, cancelledRegistration.id);
    const presence = await db!.presenca.create({ data: { participanteId: attendee.id, sessaoId: session.id, status: StatusPresenca.PRESENTE, dataRegistro: new Date() } });
    createdPresenceIds.push(presence.id);
    const work = await db!.trabalhoCientifico.create({ data: { titulo: "Work", resumo: "Summary", arquivoPdf: `${event.id}/trabalhos/${randomUUID()}/${randomUUID()}.pdf`, autorId: attendee.id, eventoId: event.id, status: StatusTrabalhoCientifico.REJEITADO } });
    createdWorkIds.push(work.id);

    const metrics = await metricsService!.getEventMetrics({ id: owner.id, perfil: owner.perfil, ativo: true }, event.id, db!);
    expect(metrics.registrations).toEqual({ total: 2, active: 1, cancelled: 1 });
    expect(metrics.sessions).toBe(1);
    expect(metrics.participantsPresent).toBe(1);
    expect(metrics.works.rejected).toBe(1);
    await expect(metricsService!.getEventMetrics({ id: outsider.id, perfil: outsider.perfil, ativo: true }, event.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
