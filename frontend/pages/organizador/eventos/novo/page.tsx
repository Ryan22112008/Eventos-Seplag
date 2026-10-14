import Link from "next/link";
import { requireRole } from "@backend/auth/access";
import { createEventAction } from "@backend/server/actions/events";
import { EventForm } from "@frontend/components/events/event-form";

export default async function NewEventPage() {
  await requireRole("ORGANIZADOR", "ADMIN");
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10"><Link href="/organizador/eventos" className="text-sm text-blue-800 hover:underline">← Meus eventos</Link><h1 className="my-6 text-3xl font-bold">Criar evento</h1><p className="mb-5 text-slate-600">O evento será salvo como rascunho. Os campos são validados antes de salvar.</p><EventForm action={createEventAction} submitLabel="Salvar rascunho" /></main>;
}
