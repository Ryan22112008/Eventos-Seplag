import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { getOwnScientificWork } from "@backend/modules/scientific-works/work-service";

const labels: Record<string, string> = { SUBMETIDO: "Submetido", EM_AVALIACAO: "Em avaliação", APROVADO: "Aprovado", REJEITADO: "Rejeitado" };

export default async function ParticipantScientificWorkDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("PARTICIPANTE");
  const { id } = await params;
  let work;
  try { work = await getOwnScientificWork(actor, id); } catch { notFound(); }
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
    <Link href="/participante/trabalhos" className="text-sm text-blue-800 underline">← Meus trabalhos</Link>
    <header className="my-7"><p className="text-sm font-semibold uppercase text-blue-800">{work.evento.titulo}</p><h1 className="mt-2 text-3xl font-bold">{work.titulo}</h1><p className="mt-3 text-slate-600">Status: {labels[work.status]}</p></header>
    <a href={`/api/trabalhos/${work.id}/arquivo`} className="inline-block rounded-md border border-blue-200 px-4 py-2 font-medium text-blue-900">Baixar PDF enviado</a>
    <section className="mt-6 rounded-xl border bg-white p-5"><h2 className="font-semibold">Resumo</h2><p className="mt-2 whitespace-pre-wrap text-slate-700">{work.resumo}</p></section>
    {work.avaliacao && <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5"><h2 className="text-xl font-semibold">Resultado: {labels[work.avaliacao.resultado]}</h2><p className="mt-1 text-sm text-slate-600">Avaliado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Cuiaba" }).format(work.avaliacao.avaliadoEm)}</p><h3 className="mt-4 font-semibold">Parecer</h3><p className="mt-2 whitespace-pre-wrap text-slate-800">{work.avaliacao.parecer}</p></section>}
  </main>;
}
