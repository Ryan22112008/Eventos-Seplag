import "server-only";
import { randomUUID } from "node:crypto";
import { PerfilUsuario } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import { DomainError } from "@backend/lib/errors";
import { getManagedEvent, type EventActor } from "./event-service";
import { assetNameSchema } from "./event.schemas";
import { detectAndValidateEventImage, MAX_EVENT_IMAGE_BYTES } from "@backend/lib/storage/validate-image";
import { getStorageService } from "@backend/lib/storage/local-storage-service";
import type { StorageService } from "@backend/lib/storage/storage-service";
import { replaceStoredObjectReference } from "@backend/lib/storage/replace-object-reference";

const fieldByAsset = { banner: "banner", arteCertificadoFrente: "arteCertificadoFrente", arteCertificadoVerso: "arteCertificadoVerso" } as const;
type AssetName = keyof typeof fieldByAsset;

function assetReferenceFilter(asset: AssetName, value: string | null) {
  switch (asset) {
    case "banner": return { banner: value };
    case "arteCertificadoFrente": return { arteCertificadoFrente: value };
    case "arteCertificadoVerso": return { arteCertificadoVerso: value };
  }
}

function assetReferenceValue(asset: AssetName, value: string | null) {
  switch (asset) {
    case "banner": return { banner: value };
    case "arteCertificadoFrente": return { arteCertificadoFrente: value };
    case "arteCertificadoVerso": return { arteCertificadoVerso: value };
  }
}

export async function replaceEventAsset(actor: EventActor, eventoId: string, assetRaw: unknown, file: File, storage: StorageService = getStorageService()) {
  const event = await getManagedEvent(actor, eventoId);
  if (!["RASCUNHO", "PUBLICADO"].includes(event.status)) throw new DomainError("INVALID_STATE", "Este evento não aceita alteração de arquivos.");
  const asset = assetNameSchema.parse(assetRaw) as AssetName;
  let newKey: string | null = null;
  try {
    if (file.size <= 0 || file.size > MAX_EVENT_IMAGE_BYTES) throw new DomainError("INVALID_DATA", "Arquivo inválido. Envie PNG ou JPEG de até 5 MB.");
    const data = Buffer.from(await file.arrayBuffer());
    const detected = detectAndValidateEventImage({ name: file.name, declaredType: file.type, data });
    newKey = `${event.id}/assets/${asset}/${randomUUID()}.${detected.extension}`;
    const keyToStore = newKey;
    const field = fieldByAsset[asset];
    const oldKey = event[field];
    await replaceStoredObjectReference({
      storage, newKey: keyToStore, data, contentType: detected.contentType, oldKey,
      updateReference: async (storedKey) => {
        const written = await prisma.evento.updateMany({
          where: { id: eventoId, ...assetReferenceFilter(asset, oldKey), status: event.status, ...(actor.perfil === PerfilUsuario.ADMIN ? {} : { organizadorId: actor.id }) },
          data: assetReferenceValue(asset, storedKey),
        });
        return written.count === 1;
      },
      logCleanupFailure: (error) => console.error("Falha ao limpar arquivo de evento sem referência.", error),
    });
    return keyToStore;
  } catch (error) {
    if (error instanceof Error && error.message === "REFERENCE_NOT_UPDATED") throw new DomainError("CONFLICT", "O evento foi alterado durante o envio. Tente novamente.");
    if (error instanceof DomainError) throw error;
    if (error instanceof Error && ["INVALID_IMAGE_SIZE", "INVALID_IMAGE_FORMAT", "IMAGE_EXTENSION_MISMATCH", "IMAGE_TYPE_MISMATCH"].includes(error.message)) {
      throw new DomainError("INVALID_DATA", "Arquivo inválido. Envie PNG ou JPEG de até 5 MB.");
    }
    console.error("Falha ao armazenar arquivo de evento.", error);
    throw new DomainError("STORAGE_UNAVAILABLE", "Não foi possível armazenar o arquivo. Tente novamente.");
  }
}

export async function removeEventAsset(actor: EventActor, eventoId: string, assetRaw: unknown, storage: StorageService = getStorageService()) {
  const event = await getManagedEvent(actor, eventoId);
  if (!["RASCUNHO", "PUBLICADO"].includes(event.status)) throw new DomainError("INVALID_STATE", "Este evento não aceita alteração de arquivos.");
  const asset = assetNameSchema.parse(assetRaw) as AssetName;
  const field = fieldByAsset[asset];
  const oldKey = event[field];
  if (!oldKey) return;
  const changed = await prisma.evento.updateMany({
    where: { id: eventoId, ...assetReferenceFilter(asset, oldKey), ...(actor.perfil === PerfilUsuario.ADMIN ? {} : { organizadorId: actor.id }) },
    data: assetReferenceValue(asset, null),
  });
  if (changed.count !== 1) throw new DomainError("CONFLICT", "O arquivo foi alterado. Atualize a página.");
  await storage.delete(oldKey).catch((error: unknown) => console.error("Falha ao remover arquivo privado do evento.", error));
}

export async function getEventAsset(actor: EventActor, eventoId: string, assetRaw: unknown, storage: StorageService = getStorageService()) {
  const event = await getManagedEvent(actor, eventoId);
  const asset = assetNameSchema.parse(assetRaw) as AssetName;
  const objectKey = event[fieldByAsset[asset]];
  if (!objectKey) throw new DomainError("NOT_FOUND", "Arquivo não encontrado.");
  const object = await storage.get(objectKey);
  if (!object) throw new DomainError("NOT_FOUND", "Arquivo não encontrado.");
  return object;
}
