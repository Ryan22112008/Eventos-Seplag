import Link from "next/link";
import { requireRole } from "@backend/auth/access";
import { listAvailableSubmissionEvents, listOwnScientificWorks, type ParticipantWorkListItem, type SubmissionEventOption } from "@backend/modules/scientific-works/work-service";

const labels: Record<string, string> = { SUBMETIDO: "Submetido", EM_AVALIACAO: "Em avaliação", APROVADO: "Aprovado", REJEITADO: "Rejeitado" };

export default async function ParticipantWorksPage() {
  const actor = await requireRole("PARTICIPANTE");
  const [works, events] = await Promise.all([listOwnScientificWorks(actor), listAvailableSubmissionEvents(actor)]);
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <Link href="/participante" className="text-sm text-blue-800 underline">← Área do participante</Link>
    <header className="my-7 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Meus trabalhos científicos</h1><p className="mt-2 text-slate-600">Acompanhe suas submissões e os pareceres registrados.</p></div>{events.length > 0 && <Link href="/participante/trabalhos/nova" className="rounded-md bg-blue-800 px-4 py-2 font-semibold text-white">Nova submissão</Link>}</header>
    {events.length > 0 && <section className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4"><h2 className="font-semibold">Eventos recebendo trabalhos</h2><ul className="mt-2 list-inside list-disc text-sm">{events.map((event: SubmissionEventOption) => <li key={event.id}>{event.titulo}</li>)}</ul></section>}
    {works.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-slate-600">Você ainda não enviou trabalhos científicos.</p> : <ul className="divide-y rounded-xl border bg-white">{works.map((work: ParticipantWorkListItem) => <li key={work.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><Link href={`/participante/trabalhos/${work.id}`} className="font-semibold text-blue-900 underline">{work.titulo}</Link><p className="mt-1 text-sm text-slate-600">{work.evento.titulo} · {labels[work.status]}</p>{work.avaliacao && <p className="mt-1 text-sm">Resultado: <strong>{labels[work.avaliacao.resultado]}</strong></p>}</div><Link href={`/participante/trabalhos/${work.id}`} className="text-sm font-medium text-blue-800 underline">Ver detalhes</Link></li>)}</ul>}
  </main>;
}
