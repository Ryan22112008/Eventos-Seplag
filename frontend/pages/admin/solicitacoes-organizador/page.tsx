import Link from "next/link";
import { StatusSolicitacaoOrganizador } from "@prisma/client";
import { AccountHeader } from "@frontend/components/account-header";
import { requireAdmin } from "@backend/auth/access";
import { prisma } from "@backend/lib/prisma";
import { approveOrganizerAction, rejectOrganizerAction } from "@backend/server/actions/admin";

const results: Record<string, string> = {
  done: "A solicitação foi processada.",
  already_processed: "A solicitação já foi processada por outra ação.",
  not_found: "A solicitação não foi encontrada.",
  invalid: "O identificador enviado não é válido.",
};

export default async function OrganizerRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const [requests, query] = await Promise.all([
    prisma.solicitacaoOrganizador.findMany({
      where: { status: StatusSolicitacaoOrganizador.PENDENTE },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
      orderBy: { createdAt: "asc" }, take: 100,
    }),
    searchParams,
  ]);
  const result = typeof query.resultado === "string" ? results[query.resultado] : undefined;
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <AccountHeader user={admin} />
    <section className="py-8"><Link href="/admin" className="text-sm font-semibold text-blue-800">← Administração</Link>
      <h1 className="mt-5 text-3xl font-bold">Solicitações de organizador</h1>
      {result && <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-950" role="status">{result}</p>}
      {requests.length === 0 ? <p className="mt-6 text-slate-600">Não há solicitações pendentes.</p> :
        <ul className="mt-6 space-y-4">{requests.map((request) => <li key={request.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="font-semibold">{request.usuario.nome}</p><p className="text-sm text-slate-600">{request.usuario.email}</p>
          <p className="mt-2 text-sm text-slate-600">Solicitado em <time dateTime={request.createdAt.toISOString()}>{request.createdAt.toLocaleString("pt-BR")}</time> · Pendente</p>
          <div className="mt-4 flex gap-3">
            <form action={approveOrganizerAction}><input type="hidden" name="solicitacaoId" value={request.id} /><button className="rounded-md bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900">Aprovar</button></form>
            <form action={rejectOrganizerAction}><input type="hidden" name="solicitacaoId" value={request.id} /><button className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50">Rejeitar</button></form>
          </div>
        </li>)}</ul>}
    </section>
  </main>;
}
