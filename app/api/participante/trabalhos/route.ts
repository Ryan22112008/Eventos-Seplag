import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@backend/auth/session";
import { submitScientificWork } from "@backend/modules/scientific-works/work-service";
import { DomainError } from "@backend/lib/errors";
import { MAX_SCIENTIFIC_WORK_BYTES } from "@backend/modules/scientific-works/validate-scientific-pdf";
import { ZodError } from "zod";
import { prisma } from "@backend/lib/prisma";
import { applicationLink, sendEmail } from "@backend/lib/email/email-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Requisição inválida." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > MAX_SCIENTIFIC_WORK_BYTES + 128 * 1024) {
    return NextResponse.json({ error: "Envie um PDF de até 10 MB." }, { status: 413 });
  }
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 });
  if (actor.perfil !== "PARTICIPANTE" || !actor.ativo) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("arquivo");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um arquivo PDF." }, { status: 400 });
    const work = await submitScientificWork(actor, {
      eventoId: form.get("eventoId"), titulo: form.get("titulo"), resumo: form.get("resumo"),
    }, file);
    try {
      const details = await prisma.trabalhoCientifico.findUnique({ where: { id: work.id }, select: { autor: { select: { email: true, nome: true } }, evento: { select: { titulo: true } } } });
      if (details) await sendEmail(details.autor.email, { subject: "Trabalho científico recebido", title: "Submissão recebida", paragraphs: [`Olá, ${details.autor.nome}. Recebemos seu trabalho para o evento “${details.evento.titulo}”. Acompanhe o status e o parecer na plataforma.`], link: applicationLink("/participante/trabalhos", "Meus trabalhos") });
    } catch (mailError) { console.error("Falha ao preparar confirmação de submissão científica.", { error: mailError instanceof Error ? mailError.name : "UnknownError" }); }
    return NextResponse.redirect(new URL(`/participante/trabalhos/${work.id}?submissao=ok`, request.url), 303);
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.redirect(new URL("/participante/trabalhos/nova?erro=dados", request.url), 303);
    if (error instanceof DomainError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : error.code === "INVALID_DATA" ? 400 : error.code === "INVALID_STATE" ? 409 : 503;
      if (status < 400 || status === 503) return NextResponse.json({ error: "Não foi possível registrar a submissão." }, { status });
      return NextResponse.redirect(new URL(`/participante/trabalhos/nova?erro=${error.code.toLowerCase()}`, request.url), 303);
    }
    console.error("Falha ao receber trabalho científico.", error);
    return NextResponse.json({ error: "Não foi possível processar a submissão." }, { status: 500 });
  }
}
