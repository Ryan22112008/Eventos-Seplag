import Link from "next/link";
import { AccountHeader } from "@frontend/components/account-header";
import { requireAdmin } from "@backend/auth/access";
import { prisma } from "@backend/lib/prisma";
import { setUserActiveAction } from "@backend/server/actions/admin";

const results: Record<string, string> = {
  changed: "O acesso do usuário foi atualizado.", unchanged: "O acesso já estava nesse estado.",
  not_found: "Usuário não encontrado.", self_protected: "Sua própria conta não pode ser desativada.",
  last_admin: "O último administrador ativo não pode ser desativado.", conflict: "Houve uma alteração simultânea. Atualize a página e tente novamente.",
  invalid: "Os dados enviados não são válidos.",
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const [users, query] = await Promise.all([
    prisma.usuario.findMany({ select: { id: true, nome: true, email: true, perfil: true, ativo: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    searchParams,
  ]);
  const result = typeof query.resultado === "string" ? results[query.resultado] : undefined;
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <AccountHeader user={admin} />
    <section className="py-8"><Link href="/admin" className="text-sm font-semibold text-blue-800">← Administração</Link>
      <h1 className="mt-5 text-3xl font-bold">Usuários</h1>
      <p className="mt-2 text-sm text-slate-600">Exibindo até 100 contas mais recentes. Desativar uma conta revoga as sessões existentes.</p>
      {result && <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-950" role="status">{result}</p>}
      <ul className="mt-6 space-y-3">{users.map((user) => <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div><p className="font-semibold">{user.nome}</p><p className="text-sm text-slate-600">{user.email} · {user.perfil} · {user.ativo ? "Ativo" : "Desativado"}</p></div>
        <form action={setUserActiveAction}>
          <input type="hidden" name="usuarioId" value={user.id} /><input type="hidden" name="ativo" value={String(!user.ativo)} />
          <button disabled={user.id === admin.id && user.ativo} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
            {user.ativo ? "Desativar" : "Ativar"}
          </button>
        </form>
      </li>)}</ul>
    </section>
  </main>;
}
