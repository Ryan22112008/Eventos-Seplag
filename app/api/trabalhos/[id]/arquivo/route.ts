import { NextResponse } from "next/server";
import { getCurrentUser } from "@backend/auth/session";
import { getScientificWorkFile } from "@backend/modules/scientific-works/work-service";
import { DomainError } from "@backend/lib/errors";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const { id } = await params;
    const pdf = await getScientificWorkFile(actor, id);
    return new Response(new Uint8Array(pdf), { status: 200, headers: {
      "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="trabalho-cientifico.pdf"',
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if (error instanceof DomainError && error.code === "NOT_FOUND") return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
