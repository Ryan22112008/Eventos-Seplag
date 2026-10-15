import Link from "next/link";
import { requireRole } from "@backend/auth/access";
import { listAvailableSubmissionEvents, type SubmissionEventOption } from "@backend/modules/scientific-works/work-service";

export default async function NewScientificWorkPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const actor = await requireRole("PARTICIPANTE");
  const [events, query] = await Promise.all([listAvailableSubmissionEvents(actor), searchParams]);
  const errorMessage = query.erro ? "Não foi possível enviar o trabalho. Confira o evento, o prazo, sua inscrição e o arquivo PDF." : null;
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
    <Link href="/participante/trabalhos" className="text-sm text-blue-800 underline">← Meus trabalhos</Link>
    <h1 className="my-6 text-3xl font-bold">Nova submissão</h1>
    {errorMessage && <p role="alert" className="mb-5 rounded-md bg-amber-50 p-3 text-amber-950">{errorMessage}</p>}
    {events.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-slate-600">Você não tem inscrição ativa em um evento que esteja recebendo trabalhos neste momento.</p> : <form action="/api/participante/trabalhos" method="post" encType="multipart/form-data" className="grid gap-4 rounded-xl border bg-white p-6">
      <label className="grid gap-1 text-sm font-medium">Evento<select name="eventoId" required className="rounded-md border p-2">{events.map((event: SubmissionEventOption) => <option value={event.id} key={event.id}>{event.titulo}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Título<input name="titulo" required minLength={5} maxLength={300} className="rounded-md border p-2" /></label>
      <label className="grid gap-1 text-sm font-medium">Resumo<textarea name="resumo" required minLength={30} maxLength={20000} rows={7} className="rounded-md border p-2" /></label>
      <label className="grid gap-1 text-sm font-medium">Arquivo PDF<input name="arquivo" required type="file" accept="application/pdf,.pdf" className="rounded-md border p-2" /><span className="text-xs text-slate-500">Somente PDF, até 10 MB. O arquivo fica privado.</span></label>
      <button className="justify-self-start rounded-md bg-blue-800 px-5 py-2.5 font-semibold text-white">Enviar trabalho</button>
    </form>}
  </main>;
}
