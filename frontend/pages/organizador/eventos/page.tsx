import Link from "next/link";
import { requireRole } from "@backend/auth/access";
import { listManagedEvents } from "@backend/modules/events/event-service";

const statusLabel: Record<string, string> = { RASCUNHO: "Rascunho", PUBLICADO: "Publicado", CANCELADO: "Cancelado", ENCERRADO: "Encerrado" };

export default async function OrganizerEventsPage() {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  const events = await listManagedEvents(actor);
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <Link href="/organizador" className="text-sm text-blue-800 hover:underline">← Área do organizador</Link>
    <header className="my-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Gestão de eventos</p><h1 className="mt-1 text-3xl font-bold">Meus eventos</h1></div><Link href="/organizador/eventos/novo" className="rounded-md bg-blue-800 px-4 py-2.5 font-semibold text-white">Criar evento</Link></header>
    {events.length === 0 ? <section className="rounded-xl border border-dashed p-10 text-center text-slate-600">Você ainda não tem eventos cadastrados.</section> : <ul className="grid gap-3">{events.map((event) => <li key={event.id} className="rounded-xl border bg-white p-5 shadow-sm"><Link href={`/organizador/eventos/${event.id}`} className="font-semibold text-blue-900 hover:underline">{event.titulo}</Link><p className="mt-1 text-sm text-slate-600">{statusLabel[event.status]} · {event.dataInicio.toLocaleString("pt-BR")} · {[event.cidade, event.local].filter(Boolean).join(" — ") || "Local não informado"}</p></li>)}</ul>}
  </main>;
}
