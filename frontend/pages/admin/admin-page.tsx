import Link from "next/link";
import { AccountHeader } from "@frontend/components/account-header";
import { requireAdmin } from "@backend/auth/access";

export default async function AdminPage() {
  const admin = await requireAdmin();
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
