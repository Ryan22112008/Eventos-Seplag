import { redirect } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { AccountHeader } from "@frontend/components/account-header";
import { isDevMockMode } from "@backend/lib/dev-mode";
import { DEV_MOCK_PARTICIPANT } from "@backend/lib/dev-mock-data";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Cuiaba" }).format(date);

export default async function ParticipantProfilePage() {
  if (!isDevMockMode()) redirect("/participante");
  const user = await requireRole("PARTICIPANTE");
  const p = DEV_MOCK_PARTICIPANT;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8">
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-950">
        Modo de desenvolvimento — demonstração; nenhuma informação é salva.
      </div>
      <Link href="/participante" className="mt-6 inline-block text-sm text-blue-800 underline">← Área do participante</Link>
      <header className="py-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Perfil do participante</p>
        <h1 className="mt-2 text-3xl font-bold">{p.nome}</h1>
        <p className="mt-3 text-slate-600">Dados cadastrais fictícios, apenas para demonstração da interface.</p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <div className="col-span-2"><dt className="text-slate-500 uppercase text-xs font-semibold">Nome</dt><dd className="font-semibold">{p.nome}</dd></div>
          <div className="col-span-2"><dt className="text-slate-500 uppercase text-xs font-semibold">E-mail</dt><dd className="font-semibold">{p.email}</dd></div>
          <div className="col-span-2"><dt className="text-slate-500 uppercase text-xs font-semibold">Perfil</dt><dd className="font-semibold">{p.perfil}</dd></div>
          <div><dt className="text-slate-500 uppercase text-xs font-semibold">Instituição</dt><dd className="font-semibold">{p.instituicao}</dd></div>
          <div><dt className="text-slate-500 uppercase text-xs font-semibold">Cargo</dt><dd className="font-semibold">{p.cargo}</dd></div>
          <div><dt className="text-slate-500 uppercase text-xs font-semibold">Cidade</dt><dd className="font-semibold">{p.cidade}</dd></div>
          <div><dt className="text-slate-500 uppercase text-xs font-semibold">Telefone</dt><dd className="font-semibold">{p.telefone}</dd></div>
          <div><dt className="text-slate-500 uppercase text-xs font-semibold">Data de cadastro</dt><dd className="font-semibold">{formatDate(p.criadoEm)}</dd></div>
          <div><dt className="text-slate-500 uppercase text-xs font-semibold">Status</dt><dd className="font-semibold text-green-700">Ativo</dd></div>
        </dl>
      </section>
      <p className="mt-8 text-center text-xs text-slate-400">Eventos SEPLAG — Ambiente de demonstração. Dados fictícios, sem conexão com banco de dados.</p>
    </main>
  );
}

import Link from "next/link";