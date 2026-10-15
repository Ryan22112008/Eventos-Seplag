import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { getManagedEvent } from "@backend/modules/events/event-service";
import { listActiveReviewers, listEventScientificWorks, type OrganizerWorkListItem, type ReviewerOption } from "@backend/modules/scientific-works/work-service";
import { assignScientificWorkAction } from "@backend/server/actions/scientific-works";

const labels: Record<string, string> = { SUBMETIDO: "Submetido", EM_AVALIACAO: "Em avaliação", APROVADO: "Aprovado", REJEITADO: "Rejeitado" };
const filters = ["TODOS", "SUBMETIDO", "EM_AVALIACAO", "APROVADO", "REJEITADO"] as const;

export default async function OrganizerScientificWorksPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string; atribuicao?: string }> }) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let event;
  try { event = await getManagedEvent(actor, id); } catch { notFound(); }
  const status = filters.includes(query.status as (typeof filters)[number]) ? query.status! : "TODOS";
  const [works, reviewers] = await Promise.all([listEventScientificWorks(actor, id, status), listActiveReviewers(actor, id)]);
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <Link href={`/organizador/eventos/${id}`} className="text-sm text-blue-800 underline">← Evento</Link>
    <h1 className="my-6 text-3xl font-bold">Trabalhos científicos · {event.titulo}</h1>
    {query.atribuicao && <p role="status" className="mb-4 rounded-md bg-blue-50 p-3">{query.atribuicao === "ok" ? "Avaliador atribuído." : "Não foi possível atribuir o avaliador. Verifique o status e tente novamente."}</p>}
    <nav aria-label="Filtrar trabalhos" className="mb-5 flex flex-wrap gap-2">{filters.map((filter) => <Link key={filter} href={`/organizador/eventos/${id}/trabalhos?status=${filter}`} aria-current={status === filter ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${status === filter ? "border-blue-800 bg-blue-50 font-semibold text-blue-900" : "text-slate-700"}`}>{filter === "TODOS" ? "Todos" : labels[filter]}</Link>)}</nav>
    {works.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-slate-600">Nenhum trabalho neste filtro.</p> : <ul className="grid gap-4">{works.map((work: OrganizerWorkListItem) => <li key={work.id} className="rounded-xl border bg-white p-5">
      <header className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-semibold">{work.titulo}</h2><p className="mt-1 text-sm text-slate-600">{work.autor.nome} · {work.autor.email} · {labels[work.status]}</p></div><a href={`/api/trabalhos/${work.id}/arquivo`} className="text-sm text-blue-800 underline">Baixar PDF privado</a></header>
      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-slate-700">{work.resumo}</p>
      {work.avaliacao ? <section className="mt-4 rounded-md bg-slate-50 p-3 text-sm"><strong>Resultado: {labels[work.avaliacao.resultado]}</strong><p className="mt-1 whitespace-pre-wrap">{work.avaliacao.parecer}</p><p className="mt-1 text-slate-500">Avaliador: {work.avaliacao.avaliador.nome}</p></section> : work.avaliador ? <p className="mt-4 text-sm text-slate-600">Atribuído a: {work.avaliador.nome}</p> : <form action={assignScientificWorkAction} className="mt-4 flex flex-wrap items-end gap-3"><input type="hidden" name="trabalhoId" value={work.id} /><input type="hidden" name="eventoId" value={id} /><label className="grid gap-1 text-sm">Avaliador<select required name="avaliadorId" className="min-w-56 rounded-md border p-2"><option value="">Selecione</option>{reviewers.map((reviewer: ReviewerOption) => <option key={reviewer.id} value={reviewer.id}>{reviewer.nome}</option>)}</select></label><button className="rounded-md bg-blue-800 px-4 py-2 font-semibold text-white">Atribuir</button></form>}
    </li>)}</ul>}
  </main>;
}
