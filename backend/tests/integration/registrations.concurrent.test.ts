import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient, PerfilUsuario, ModalidadeEvento, StatusEvento, StatusInscricao } from "@prisma/client";
import type { RegistrationActor } from "@backend/modules/registrations/registration-service";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) console.warn("Integração de inscrições ignorada: configure TEST_DATABASE_URL para um banco MySQL exclusivo de testes.");
const db = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const integration = databaseUrl ? describe : describe.skip;
type RegistrationService = typeof import("@backend/modules/registrations/registration-service");
let registrationService: RegistrationService | null = null;

let createdUsers: string[] = [];
let createdEvents: string[] = [];
let createdRegistrations: string[] = [];

async function fixture(vacancies: number, status: StatusEvento = StatusEvento.PUBLICADO, endsAt = new Date(Date.now() + 86_400_000)) {
  if (!db) throw new Error("MySQL de integração não configurado.");
  const organizer = await db.usuario.create({ data: { nome: "Organizer test", email: `${randomUUID()}@example.test`, senhaHash: "test-hash", perfil: PerfilUsuario.ORGANIZADOR } });
  createdUsers.push(organizer.id);
  const event = await db.evento.create({ data: {
    titulo: "Evento de teste", descricao: "Descrição", dataInicio: new Date(Date.now() + 3_600_000), dataTermino: endsAt, modalidade: ModalidadeEvento.PRESENCIAL,
    nicho: "Teste", vagasTotais: vacancies, vagasRestantes: vacancies, cargaHoraria: 1, organizadorId: organizer.id, status,
  } });
  createdEvents.push(event.id);
  return event;
}

async function participant(): Promise<RegistrationActor> {
  if (!db) throw new Error("MySQL de integração não configurado.");
  const user = await db.usuario.create({ data: { nome: "Participant test", email: `${randomUUID()}@example.test`, senhaHash: "test-hash", perfil: PerfilUsuario.PARTICIPANTE } });
  createdUsers.push(user.id);
  return { id: user.id, perfil: user.perfil, ativo: true };
}

async function captureRegistration(eventId: string, actor: RegistrationActor) {
  if (!db) throw new Error("MySQL de integração não configurado.");
  const record = await db.inscricao.findUnique({ where: { participanteId_eventoId: { participanteId: actor.id, eventoId: eventId } }, select: { id: true } });
  if (record) createdRegistrations.push(record.id);
}

beforeAll(async () => { if (db) { await db.$connect(); registrationService = await import("@backend/modules/registrations/registration-service"); } });
afterEach(async () => {
  if (!db) return;
  if (createdRegistrations.length) await db.inscricao.deleteMany({ where: { id: { in: createdRegistrations } } });
  if (createdEvents.length) await db.evento.deleteMany({ where: { id: { in: createdEvents } } });
  if (createdUsers.length) await db.usuario.deleteMany({ where: { id: { in: createdUsers } } });
  createdUsers = []; createdEvents = []; createdRegistrations = [];
});
afterAll(async () => { await db?.$disconnect(); });

integration("MySQL transactional registrations", () => {
  it("permits exactly one of two concurrent participants for one seat", async () => {
    const event = await fixture(1);
    const actors = await Promise.all([participant(), participant()]);
    const results = await Promise.allSettled(actors.map((actor) => registrationService!.registerForEvent(actor, event.id, db!)));
    for (const actor of actors) await captureRegistration(event.id, actor);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const [active, current] = await Promise.all([db!.inscricao.count({ where: { eventoId: event.id, status: StatusInscricao.ATIVA } }), db!.evento.findUniqueOrThrow({ where: { id: event.id }, select: { vagasRestantes: true } })]);
    expect(active).toBe(1); expect(current.vagasRestantes).toBe(0);
  });

  it("permits exactly two of three concurrent participants for two seats", async () => {
    const event = await fixture(2);
    const actors = await Promise.all([participant(), participant(), participant()]);
    const results = await Promise.allSettled(actors.map((actor) => registrationService!.registerForEvent(actor, event.id, db!)));
    for (const actor of actors) await captureRegistration(event.id, actor);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const [active, current] = await Promise.all([db!.inscricao.count({ where: { eventoId: event.id, status: StatusInscricao.ATIVA } }), db!.evento.findUniqueOrThrow({ where: { id: event.id }, select: { vagasRestantes: true } })]);
    expect(active).toBe(2); expect(current.vagasRestantes).toBe(0);
  });

  it("rolls back a seat when the same participant races a duplicate registration", async () => {
    const event = await fixture(2);
    const actor = await participant();
    const results = await Promise.allSettled([
      registrationService!.registerForEvent(actor, event.id, db!),
      registrationService!.registerForEvent(actor, event.id, db!),
    ]);
    await captureRegistration(event.id, actor);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const [count, current] = await Promise.all([
      db!.inscricao.count({ where: { eventoId: event.id, participanteId: actor.id } }),
      db!.evento.findUniqueOrThrow({ where: { id: event.id }, select: { vagasRestantes: true, vagasTotais: true } }),
    ]);
    expect(count).toBe(1);
    expect(current.vagasRestantes).toBe(current.vagasTotais - 1);
  });

  it("returns one seat on own cancellation, is idempotent, and preserves cancelled history", async () => {
    const event = await fixture(1);
    const actor = await participant();
    const record = await registrationService!.registerForEvent(actor, event.id, db!);
    createdRegistrations.push(record.id);
    expect((await db!.evento.findUniqueOrThrow({ where: { id: event.id }, select: { vagasRestantes: true } })).vagasRestantes).toBe(0);
    expect(await registrationService!.cancelOwnRegistration(actor, record.id, db!)).toEqual({ cancelled: true });
    expect(await registrationService!.cancelOwnRegistration(actor, record.id, db!)).toEqual({ cancelled: false });
    expect((await db!.evento.findUniqueOrThrow({ where: { id: event.id }, select: { vagasRestantes: true, vagasTotais: true } })).vagasRestantes).toBe(1);
    await expect(registrationService!.registerForEvent(actor, event.id, db!)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db!.inscricao.count({ where: { eventoId: event.id } })).toBe(1);
  });

  it("does not let another participant cancel an owner's registration", async () => {
    const event = await fixture(1);
    const owner = await participant(); const outsider = await participant();
    const record = await registrationService!.registerForEvent(owner, event.id, db!);
    createdRegistrations.push(record.id);
    await expect(registrationService!.cancelOwnRegistration(outsider, record.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await db!.evento.findUniqueOrThrow({ where: { id: event.id }, select: { vagasRestantes: true } })).vagasRestantes).toBe(0);
  });

  it("rejects inactive accounts, incompatible profiles, unavailable states, ended events, and full events", async () => {
    const actor = await participant();
    const draft = await fixture(1, StatusEvento.RASCUNHO);
    const cancelled = await fixture(1, StatusEvento.CANCELADO);
    const closed = await fixture(1, StatusEvento.ENCERRADO);
    const ended = await fixture(1, StatusEvento.PUBLICADO, new Date(Date.now() - 60_000));
    const full = await fixture(0);
    await expect(registrationService!.registerForEvent({ ...actor, ativo: false }, draft.id, db!)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(registrationService!.registerForEvent({ ...actor, perfil: PerfilUsuario.ORGANIZADOR }, draft.id, db!)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(registrationService!.registerForEvent(actor, draft.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(registrationService!.registerForEvent(actor, cancelled.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(registrationService!.registerForEvent(actor, closed.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(registrationService!.registerForEvent(actor, ended.id, db!)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(registrationService!.registerForEvent(actor, full.id, db!)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
