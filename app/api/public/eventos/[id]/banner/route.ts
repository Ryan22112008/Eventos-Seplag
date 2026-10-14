import { NextResponse } from "next/server";
import { getPublicEventBanner } from "@backend/modules/events/public-event-service";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const object = await getPublicEventBanner(id);
    if (!object) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    return new NextResponse(new Uint8Array(object.data), { headers: { "Content-Type": object.contentType, "Cache-Control": "public, max-age=60, stale-while-revalidate=300", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch (error) {
    console.error("Falha ao recuperar banner público de evento.", error);
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
