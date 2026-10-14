import "server-only";
import { Prisma, StatusEvento } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { parsePublicEventSearchParams } from "./public-event.schemas";

export type PublicEventCard = {
  id: string; titulo: string; descricao: string; dataInicio: Date; dataTermino: Date; cidade: string | null;
  modalidade: "PRESENCIAL" | "ONLINE" | "HIBRIDO"; nicho: string; vagasRestantes: number;
  cargaHoraria: number | { toString(): string }; banner: string | null;
};

type DecimalLike = { toString(): string };
export type PublicEventDetails = {
  titulo: string; descricao: string; dataInicio: Date; dataTermino: Date; local: string | null; cidade: string | null; urlGoogleMaps: string | null;
  latitude: DecimalLike | null; longitude: DecimalLike | null; modalidade: "PRESENCIAL" | "ONLINE" | "HIBRIDO"; nicho: string;
  vagasRestantes: number; cargaHoraria: DecimalLike; banner: string | null; disciplinas: Array<{ nome: string; cargaHoraria: DecimalLike }>;
};

export async function listPublicEvents(rawParams: Record<string, string | string[] | undefined>) {
  const parsed = parsePublicEventSearchParams(rawParams);
  if (!parsed.success) return { valid: false as const, events: [], page: 1, pageSize: 12, totalPages: 0 };
  const { q, nicho, modalidade, cidade, futuro, dataDe, dataAte, page, pageSize } = parsed.data;
  const now = new Date();
  const filters: Prisma.EventoWhereInput[] = [{ status: StatusEvento.PUBLICADO }, { dataTermino: { gt: now } }];
  if (q) filters.push({ OR: [
    { titulo: { contains: q, mode: "insensitive" } },
    { descricao: { contains: q, mode: "insensitive" } },
    { nicho: { contains: q, mode: "insensitive" } },
    { cidade: { contains: q, mode: "insensitive" } },
  ] });
  if (nicho) filters.push({ nicho: { equals: nicho, mode: "insensitive" } });
  if (modalidade) filters.push({ modalidade });
  if (cidade) filters.push({ cidade: { equals: cidade, mode: "insensitive" } });
  if (futuro === "true") filters.push({ dataInicio: { gt: now } });
  if (dataDe || dataAte) filters.push({ dataInicio: { ...(dataDe ? { gte: dataDe } : {}), ...(dataAte ? { lte: new Date(dataAte.getTime() + 86_399_999) } : {}) } });
  const where: Prisma.EventoWhereInput = { AND: filters };
  const [events, total] = await Promise.all([
    prisma.evento.findMany({ where, orderBy: [{ dataInicio: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, titulo: true, descricao: true, dataInicio: true, dataTermino: true, cidade: true, modalidade: true, nicho: true, vagasRestantes: true, cargaHoraria: true, banner: true } }),
    prisma.evento.count({ where }),
  ]);
  return { valid: true as const, events: events as PublicEventCard[], page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getPublicEvent(id: string): Promise<PublicEventDetails | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  return await prisma.evento.findFirst({ where: { id, status: StatusEvento.PUBLICADO, dataTermino: { gt: new Date() } }, select: {
    titulo: true, descricao: true, dataInicio: true, dataTermino: true, local: true, cidade: true, urlGoogleMaps: true, latitude: true, longitude: true,
    modalidade: true, nicho: true, vagasRestantes: true, cargaHoraria: true, banner: true,
    disciplinas: { orderBy: { nome: "asc" }, select: { nome: true, cargaHoraria: true } },
  } }) as PublicEventDetails | null;
}

export async function getPublicEventBanner(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const event = await prisma.evento.findFirst({ where: { id, status: StatusEvento.PUBLICADO }, select: { banner: true } });
  if (!event?.banner) return null;
  const { getStorageService } = await import("@backend/lib/storage/local-storage-service");
  const object = await getStorageService().get(event.banner);
  return object ? { ...object, eventId: id } : null;
}
