import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@backend/auth/session";
import { replaceEventAsset } from "@backend/modules/events/asset-service";
import { getManagedEvent } from "@backend/modules/events/event-service";
import { DomainError } from "@backend/lib/errors";
import { MAX_EVENT_IMAGE_BYTES } from "@backend/lib/storage/validate-image";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_EVENT_IMAGE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Envie um arquivo de imagem de até 5 MB." }, { status: 413 });
  }
  const actor = await getCurrentUser();
  if (!actor || !["ORGANIZADOR", "ADMIN"].includes(actor.perfil)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const { id } = await context.params;
  try {
    await getManagedEvent(actor, id);
    const data = await request.formData();
    const asset = data.get("asset");
    const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
    if (file.size > MAX_EVENT_IMAGE_BYTES) return NextResponse.json({ error: "Envie um arquivo de imagem de até 5 MB." }, { status: 413 });
    await replaceEventAsset(actor, id, asset, file);
    return NextResponse.redirect(new URL(`/organizador/eventos/${id}?salvo=arquivo`, request.url), 303);
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : 400;
      if (status === 400) return NextResponse.redirect(new URL(`/organizador/eventos/${id}?erro=arquivo`, request.url), 303);
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Falha ao processar upload privado de evento.", error);
    return NextResponse.json({ error: "Não foi possível processar o arquivo." }, { status: 500 });
  }
}
