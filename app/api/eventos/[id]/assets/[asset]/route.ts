import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@backend/auth/session";
import { getEventAsset } from "@backend/modules/events/asset-service";
import { DomainError } from "@backend/lib/errors";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string; asset: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !["ORGANIZADOR", "ADMIN"].includes(actor.perfil)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const { id, asset } = await context.params;
  try {
    const object = await getEventAsset(actor, id, asset);
    return new NextResponse(new Uint8Array(object.data), {
      headers: { "Content-Type": object.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: status === 404 ? "Arquivo não encontrado." : "Acesso negado." }, { status });
    }
    console.error("Falha ao recuperar arquivo privado de evento.", error);
    return NextResponse.json({ error: "Não foi possível recuperar o arquivo." }, { status: 500 });
  }
}
