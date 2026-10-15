import Link from "next/link";
import { requireRole } from "@backend/auth/access";
import { listAssignedScientificWorks, type ReviewerWorkListItem } from "@backend/modules/scientific-works/work-service";

const labels: Record<string, string> = { SUBMETIDO: "Submetido", EM_AVALIACAO: "Em avaliação", APROVADO: "Aprovado", REJEITADO: "Rejeitado" };

export default async function ReviewerWorksPage() {
  const actor = await requireRole("AVALIADOR");
  const works = await listAssignedScientificWorks(actor);
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <h1 className="text-3xl font-bold">Trabalhos atribuídos</h1>
    <p className="mt-2 text-slate-600">Esta lista contém somente trabalhos atribuídos à sua conta.</p>
    {works.length === 0 ? <p className="mt-7 rounded-xl border border-dashed p-8 text-slate-600">Nenhum trabalho atribuído.</p> : <ul className="mt-7 divide-y rounded-xl border bg-white">{works.map((work: ReviewerWorkListItem) => <li key={work.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><Link href={`/avaliador/trabalhos/${work.id}`} className="font-semibold text-blue-900 underline">{work.titulo}</Link><p className="mt-1 text-sm text-slate-600">{work.evento.titulo} · {labels[work.status]}</p></div><Link href={`/avaliador/trabalhos/${work.id}`} className="text-sm text-blue-800 underline">{work.avaliacao ? "Ver avaliação" : "Avaliar"}</Link></li>)}</ul>}
  </main>;
}
