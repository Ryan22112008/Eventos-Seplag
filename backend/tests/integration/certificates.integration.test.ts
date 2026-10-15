import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ModalidadeEvento, PerfilUsuario, PrismaClient, StatusEvento, StatusInscricao, StatusPresenca } from "@prisma/client";
import type { AttendanceActor } from "@backend/modules/attendance/attendance-service";
import type { StorageContentType, StorageObject, StorageService } from "@backend/lib/storage/storage-service";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) console.warn("Integração de certificados ignorada: configure TEST_DATABASE_URL para um banco MySQL exclusivo de testes.");
const db = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null;
const integration = databaseUrl ? describe : describe.skip;
type CertificateService = typeof import("@backend/modules/certificates/certificate-service");
type CertificateModule = typeof import("@backend/modules/certificates/certificate-pdf");
let service: CertificateService | null = null;
let pdf: CertificateModule | null = null;
let users: string[] = [];
let events: string[] = [];
let registrations: string[] = [];
let sessions: string[] = [];
const files = new Map<string, StorageObject>();
const writes: string[] = [];
const storage: StorageService = {
  put: async (key: string, data: Buffer, contentType: StorageContentType) => { files.set(key, { data, contentType }); writes.push(key); },
  get: async (key: string) => files.get(key) ?? null,
  delete: async (key: string) => { files.delete(key); },
};
const originalEnvironment: Record<string, string | undefined> = {};

async function createUser(perfil: PerfilUsuario): Promise<AttendanceActor> {
  if (!db) throw new Error("MySQL de integração não configurado.");
  const user = await db.usuario.create({ data: { nome: `Participante ${randomUUID().slice(0, 8)}`, email: `${randomUUID()}@example.test`, senhaHash: "test-only", perfil } });
  users.push(user.id);
  return { id: user.id, perfil: user.perfil, ativo: true };
}

async function fixture(options: { sessions?: number; presences?: number; registrationStatus?: StatusInscricao; status?: StatusEvento } = {}) {
  if (!db) throw new Error("MySQL de integração não configurado.");
  const organizer = await createUser(PerfilUsuario.ORGANIZADOR);
  const participant = await createUser(PerfilUsuario.PARTICIPANTE);
  const now = new Date();
  const event = await db.evento.create({ data: {
    titulo: "Evento de teste de certificado", descricao: "Fixture de integração", dataInicio: new Date(now.getTime() - 3_600_000), dataTermino: new Date(now.getTime() - 60_000),
    modalidade: ModalidadeEvento.PRESENCIAL, nicho: "Teste", vagasTotais: 10, vagasRestantes: 9,
    cargaHoraria: 8, percentualMinimoPresenca: 75, organizadorId: organizer.id, status: options.status ?? StatusEvento.ENCERRADO,
  } });
  events.push(event.id);
  const sessionRecords = [];
  const count = options.sessions ?? 4;
  for (let index = 0; index < count; index++) {
    const inicio = new Date(now.getTime() - (count - index) * 5 * 60_000);
    const session = await db.sessao.create({ data: { eventoId: event.id, nome: `Sessão ${index + 1}`, inicio, fim: new Date(inicio.getTime() + 2 * 60_000) } });
    sessions.push(session.id);
    sessionRecords.push(session);
  }
  const registration = await db.inscricao.create({ data: {
    participanteId: participant.id, eventoId: event.id, tokenIngresso: randomUUID(), status: options.registrationStatus ?? StatusInscricao.ATIVA,
  } });
  registrations.push(registration.id);
  for (const session of sessionRecords.slice(0, options.presences ?? 3)) {
    await db.presenca.create({ data: { participanteId: participant.id, sessaoId: session.id, status: StatusPresenca.PRESENTE, dataRegistro: new Date(now.getTime() - 30_000) } });
  }
  return { organizer, participant, event, sessionRecords };
}

beforeAll(async () => {
  for (const name of ["BASE_URL", "CERTIFICATE_INSTITUTION_NAME", "CERTIFICATE_TEXT", "CERTIFICATE_LOGO_PATH"]) originalEnvironment[name] = process.env[name];
  process.env.BASE_URL = "https://certificates.example.test";
  process.env.CERTIFICATE_INSTITUTION_NAME = "Instituição de teste";
  process.env.CERTIFICATE_TEXT = "Certificamos {{participante}} pela participação em {{evento}} com {{cargaHoraria}} horas.";
  if (db) {
    await db.$connect();
    service = await import("@backend/modules/certificates/certificate-service");
    pdf = await import("@backend/modules/certificates/certificate-pdf");
  }
});

afterEach(async () => {
  if (!db) return;
  if (events.length) await db.certificado.deleteMany({ where: { conclusao: { eventoId: { in: events } } } });
  if (events.length) await db.conclusaoParticipante.deleteMany({ where: { eventoId: { in: events } } });
  if (sessions.length) await db.presenca.deleteMany({ where: { sessaoId: { in: sessions } } });
  if (registrations.length) await db.inscricao.deleteMany({ where: { id: { in: registrations } } });
  if (sessions.length) await db.sessao.deleteMany({ where: { id: { in: sessions } } });
  if (events.length) await db.evento.deleteMany({ where: { id: { in: events } } });
  if (users.length) await db.usuario.deleteMany({ where: { id: { in: users } } });
  users = []; events = []; registrations = []; sessions = []; files.clear(); writes.length = 0;
});

afterAll(async () => {
  await db?.$disconnect();
  for (const name of Object.keys(originalEnvironment)) {
    if (originalEnvironment[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnvironment[name];
  }
});

integration("MySQL frequency consolidation and certificate", () => {
  it("consolidates exactly-at-threshold participation, emits one PDF and remains idempotent", async () => {
    const { organizer, participant, event } = await fixture({ sessions: 4, presences: 3 });
    const first = await service!.consolidateEventParticipation(organizer, event.id, db!, storage);
    expect(first).toMatchObject({ alreadyConsolidated: false, totalParticipantes: 1, concluidos: 1, certificadosEmitidos: 1 });
    const certificate = await db!.certificado.findFirstOrThrow({ where: { conclusao: { eventoId: event.id, participanteId: participant.id } } });
    expect(certificate.codigo).toMatch(/^[0-9a-f-]{36}$/i);
    expect(files.get(certificate.arquivoPdf)?.data.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const publicView = await pdf!.buildCertificateValidationUrl(process.env.BASE_URL!, certificate.codigo);
    expect(publicView).toBe(`https://certificates.example.test/certificados/validar/${certificate.codigo}`);
    await expect(service!.getPublicCertificate(certificate.codigo, db!)).resolves.toMatchObject({ conclusao: { situacao: "CONCLUIDO" } });
    const ownPdf = await service!.getOwnCertificatePdf(participant, certificate.id, db!, storage);
    expect(ownPdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const outsider = await createUser(PerfilUsuario.PARTICIPANTE);
    await expect(service!.getOwnCertificatePdf(outsider, certificate.id, db!, storage)).rejects.toMatchObject({ code: "NOT_FOUND" });

    const second = await service!.consolidateEventParticipation(organizer, event.id, db!, storage);
    expect(second).toMatchObject({ alreadyConsolidated: true, concluidos: 1, certificadosEmitidos: 1 });
    expect(writes).toHaveLength(1);
    expect(await db!.certificado.count({ where: { conclusao: { eventoId: event.id } } })).toBe(1);
  });

  it("stores a non-completion below the threshold without issuing a certificate", async () => {
    const { organizer, participant, event } = await fixture({ sessions: 4, presences: 2 });
    const report = await service!.consolidateEventParticipation(organizer, event.id, db!, storage);
    expect(report).toMatchObject({ concluidos: 0, naoConcluidos: 1, certificadosEmitidos: 0 });
    expect(await db!.conclusaoParticipante.findFirst({ where: { eventoId: event.id, participanteId: participant.id } })).toMatchObject({ situacao: "NAO_CONCLUIDO", sessoesTotais: 4, sessoesPresentes: 2 });
    expect(await db!.certificado.count({ where: { conclusao: { eventoId: event.id } } })).toBe(0);
  });

  it("excludes canceled registrations and handles events without sessions or participants", async () => {
    const canceled = await fixture({ registrationStatus: StatusInscricao.CANCELADA });
    const cancelledReport = await service!.consolidateEventParticipation(canceled.organizer, canceled.event.id, db!, storage);
    expect(cancelledReport).toMatchObject({ totalParticipantes: 0, certificadosEmitidos: 0 });
    const emptyOrganizer = await createUser(PerfilUsuario.ORGANIZADOR);
    const now = new Date();
    const emptyEvent = await db!.evento.create({ data: {
      titulo: "Evento sem sessões", descricao: "Fixture", dataInicio: new Date(now.getTime() - 3_600_000), dataTermino: new Date(now.getTime() - 60_000),
      modalidade: ModalidadeEvento.ONLINE, nicho: "Teste", vagasTotais: 0, vagasRestantes: 0, cargaHoraria: 1,
      organizadorId: emptyOrganizer.id, status: StatusEvento.ENCERRADO,
    } });
    events.push(emptyEvent.id);
    expect(await service!.consolidateEventParticipation(emptyOrganizer, emptyEvent.id, db!, storage)).toMatchObject({ totalParticipantes: 0, concluidos: 0, certificadosEmitidos: 0 });
  });

  it("requires an ended event and denies an organizer who does not own the event", async () => {
    const { organizer, event } = await fixture({ status: StatusEvento.PUBLICADO });
    const other = await createUser(PerfilUsuario.ORGANIZADOR);
    await expect(service!.consolidateEventParticipation(other, event.id, db!, storage)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service!.consolidateEventParticipation(organizer, event.id, db!, storage)).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
