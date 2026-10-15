import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { getAssignedScientificWork } from "@backend/modules/scientific-works/work-service";
import { evaluateScientificWorkAction } from "@backend/server/actions/scientific-works";

const labels: Record<string, string> = { SUBMETIDO: "Submetido", EM_AVALIACAO: "Em avaliação", APROVADO: "Aprovado", REJEITADO: "Rejeitado" };

export default async function ReviewScientificWorkPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ avaliacao?: string }> }) {
  const actor = await requireRole("AVALIADOR");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let work;
  try { work = await getAssignedScientificWork(actor, id); } catch { notFound(); }
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
    <Link href="/avaliador/trabalhos" className="text-sm text-blue-800 underline">← Trabalhos atribuídos</Link>
    <h1 className="my-6 text-3xl font-bold">{work.titulo}</h1>
    <p className="text-sm text-slate-600">{work.evento.titulo} · {labels[work.status]}</p>
    <a href={`/api/trabalhos/${work.id}/arquivo`} className="mt-4 inline-block rounded-md border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-900">Baixar PDF para avaliação</a>
    <section className="mt-5 rounded-xl border bg-white p-5"><h2 className="font-semibold">Resumo</h2><p className="mt-2 whitespace-pre-wrap">{work.resumo}</p></section>
    {work.avaliacao ? <section className="mt-5 rounded-xl border bg-green-50 p-5"><h2 className="text-xl font-semibold">Avaliação registrada: {labels[work.avaliacao.resultado]}</h2><p className="mt-3 whitespace-pre-wrap">{work.avaliacao.parecer}</p><p className="mt-2 text-sm text-slate-600">Avaliado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Cuiaba" }).format(work.avaliacao.avaliadoEm)}</p></section> : work.status === "EM_AVALIACAO" ? <section className="mt-5 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Registrar avaliação</h2>{query.avaliacao && <p role="alert" className="mt-3 rounded-md bg-amber-50 p-3">Não foi possível enviar. Confira o resultado e escreva um parecer de pelo menos 20 caracteres.</p>}<form action={evaluateScientificWorkAction} className="mt-4 grid gap-4"><input type="hidden" name="trabalhoId" value={work.id} /><label className="grid gap-1 text-sm font-medium">Resultado<select name="resultado" required className="rounded-md border p-2"><option value="">Selecione</option><option value="APROVADO">Aprovado</option><option value="REJEITADO">Rejeitado</option></select></label><label className="grid gap-1 text-sm font-medium">Parecer<textarea name="parecer" required minLength={20} maxLength={10000} rows={7} className="rounded-md border p-2" /></label><button className="justify-self-start rounded-md bg-blue-800 px-5 py-2.5 font-semibold text-white">Enviar avaliação final</button></form></section> : <p className="mt-5 rounded-md bg-amber-50 p-4">Este trabalho não está aguardando uma avaliação.</p>}
  </main>;
}
