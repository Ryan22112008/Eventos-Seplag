import { AccountHeader } from "@frontend/components/account-header";
import { requireOrganizer } from "@backend/auth/access";
import Link from "next/link";
import { isDevMockMode } from "@backend/lib/dev-mode";

export default async function OrganizerPage() {
  const user = await requireOrganizer();
  if (isDevMockMode()) {
    return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <AccountHeader user={user} />
      <section className="py-10"><h1 className="text-3xl font-bold">Área do organizador</h1>
        <p className="mt-4 text-slate-600">Seu perfil de organizador está ativo.</p>
        <Link href="/organizador/eventos" className="mt-6 inline-flex rounded-md bg-blue-800 px-4 py-2.5 font-semibold text-white">Gerenciar eventos</Link>
        <article className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Evento fictício · PUBLICADO</p>
          <h2 className="mt-2 text-xl font-semibold">Seminário de Inovação Pública</h2>
          <p className="mt-2 text-slate-600">42 inscrições · 3 trabalhos científicos</p>
          <nav className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/organizador/eventos/dev-evento" className="text-blue-800 underline">Detalhes</Link>
            <Link href="/organizador/eventos/dev-evento/frequencia" className="text-blue-800 underline">Frequência</Link>
            <Link href="/organizador/eventos/dev-evento/metricas" className="text-blue-800 underline">Métricas</Link>
          </nav>
        </article>
      </section>
    </main>;
  }
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <AccountHeader user={user} />
    <section className="py-10"><h1 className="text-3xl font-bold">Área do organizador</h1>
      <p className="mt-4 text-slate-600">Seu perfil de organizador está ativo.</p>
      <Link href="/organizador/eventos" className="mt-6 inline-flex rounded-md bg-blue-800 px-4 py-2.5 font-semibold text-white">Gerenciar eventos</Link>
    </section>
  </main>;
}
