import Link from "next/link";
import { AccountHeader } from "@frontend/components/account-header";
import { requireAdmin } from "@backend/auth/access";
import { isDevMockMode } from "@backend/lib/dev-mode";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (isDevMockMode()) {
    return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <AccountHeader user={admin} />
      <section className="py-10"><h1 className="text-3xl font-bold">Administração</h1>
        <p className="mt-4 text-slate-600">Gerencie solicitações de organizador e o acesso de usuários.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Solicitações fictícias</p><p className="mt-2 text-2xl font-bold">1 pendente</p></article>
          <article className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Contas demonstrativas</p><p className="mt-2 text-2xl font-bold">4 ativas</p></article>
        </div>
        <nav className="mt-7 flex flex-wrap gap-4">
          <Link className="rounded-md bg-blue-800 px-4 py-3 font-medium text-white hover:bg-blue-900" href="/admin/solicitacoes-organizador">Solicitações de organizador</Link>
          <Link className="rounded-md border border-slate-300 px-4 py-3 font-medium hover:bg-slate-100" href="/admin/usuarios">Usuários</Link>
        </nav>
      </section>
    </main>;
  }
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <AccountHeader user={admin} />
    <section className="py-10"><h1 className="text-3xl font-bold">Administração</h1>
      <p className="mt-4 text-slate-600">Gerencie solicitações de organizador e o acesso de usuários.</p>
      <nav className="mt-7 flex flex-wrap gap-4">
        <Link className="rounded-md bg-blue-800 px-4 py-3 font-medium text-white hover:bg-blue-900" href="/admin/solicitacoes-organizador">Solicitações de organizador</Link>
        <Link className="rounded-md border border-slate-300 px-4 py-3 font-medium hover:bg-slate-100" href="/admin/usuarios">Usuários</Link>
      </nav>
    </section>
  </main>;
}
