import Link from "next/link";
import { StatusSolicitacaoOrganizador } from "@prisma/client";
import { AccountHeader } from "@frontend/components/account-header";
import { requireRole } from "@backend/auth/access";
import { prisma } from "@backend/lib/prisma";
import { requestOrganizerAction } from "@backend/server/actions/auth";
import { cancelOwnRegistrationAction } from "@backend/server/actions/registrations";

type ParticipantRegistration = { id: string; status: string; createdAt: Date; evento: { id: string; titulo: string; dataInicio: Date; status: string } };

const requestMessages: Record<string, string> = {
  created: "Solicitação enviada para análise administrativa.",
  pending: "Você já tem uma solicitação pendente.",
  approved: "Sua solicitação já foi aprovada.",
  not_participant: "Sua conta não está habilitada para esta solicitação.",
  conflict: "Não foi possível concluir a solicitação. Atualize a página e tente novamente.",
  erro: "Não foi possível concluir a solicitação.",
};

export default async function ParticipantPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("PARTICIPANTE");
  const [latest, registrations, query] = await Promise.all([
    prisma.solicitacaoOrganizador.findFirst({ where: { usuarioId: user.id }, orderBy: { createdAt: "desc" }, select: { status: true } }),
    prisma.inscricao.findMany({ where: { participanteId: user.id }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, status: true, createdAt: true, evento: { select: { id: true, titulo: true, dataInicio: true, status: true } } } }) as Promise<ParticipantRegistration[]>,
    searchParams,
  ]);
  const result = typeof query.solicitacao === "string" ? requestMessages[query.solicitacao] : undefined;
  const hasPending = latest?.status === StatusSolicitacaoOrganizador.PENDENTE;
  const wasApproved = latest?.status === StatusSolicitacaoOrganizador.APROVADO;
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <AccountHeader user={user} />
    <section className="py-10">
      <h1 className="text-3xl font-bold">Área do participante</h1>
      {query.cadastro === "ok" && <p className="mt-4 rounded-md bg-green-50 p-3 text-green-900" role="status">Conta criada. Você está conectado.</p>}
      <p className="mt-4 text-slate-600">Acompanhe suas inscrições, presenças, frequência e certificados.</p>
      <Link href="/participante/certificados" className="mt-3 inline-block font-medium text-blue-800 underline">Ver frequência e certificados</Link>
      <Link href="/participante/trabalhos" className="ml-4 mt-3 inline-block font-medium text-blue-800 underline">Meus trabalhos científicos</Link>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Minhas inscrições</h2>
        {query.inscricao === "cancelada" && <p className="mt-3 rounded-md bg-green-50 p-3 text-green-900" role="status">Inscrição cancelada. A vaga foi devolvida.</p>}
        {query.inscricao === "erro" && <p className="mt-3 rounded-md bg-amber-50 p-3 text-amber-950" role="alert">Não foi possível cancelar a inscrição.</p>}
        {registrations.length === 0 ? <p className="mt-3 text-slate-600">Você ainda não possui inscrições. <Link href="/eventos" className="text-blue-800 underline">Explorar eventos</Link></p> : <ul className="mt-4 divide-y divide-slate-200">{registrations.map((registration) => <li key={registration.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><Link href={`/eventos/${registration.evento.id}`} className="font-medium text-blue-900 hover:underline">{registration.evento.titulo}</Link><p className="text-sm text-slate-600">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Cuiaba" }).format(registration.evento.dataInicio)} · {registration.status.toLowerCase()}</p></div><div className="flex flex-wrap gap-3">{registration.status === "ATIVA" && <><Link href={`/participante/inscricoes/${registration.id}/ingresso`} className="self-center text-sm font-medium text-blue-800 underline">Ver ingresso</Link><Link href="/participante/check-in" className="self-center text-sm font-medium text-blue-800 underline">Fazer check-in</Link><form action={cancelOwnRegistrationAction}><input type="hidden" name="inscricaoId" value={registration.id} /><button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Cancelar inscrição</button></form></>}{registration.status !== "ATIVA" && <Link href={`/participante/inscricoes/${registration.id}/ingresso`} className="self-center text-sm font-medium text-blue-800 underline">Ver detalhes</Link>}</div></li>)}</ul>}
      </section>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Perfil de organizador</h2>
        <p className="mt-2 text-sm text-slate-600">A aprovação é feita pela administração. Solicitar não altera seu perfil atual.</p>
        {result && <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-950" role="status">{result}</p>}
        {hasPending ? <p className="mt-4 font-medium">Sua solicitação está pendente.</p>
          : wasApproved ? <p className="mt-4 font-medium">Sua solicitação foi aprovada.</p>
          : <form action={requestOrganizerAction} className="mt-5"><input type="hidden" name="intent" value="request" /><button className="rounded-md bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900">Solicitar perfil de organizador</button></form>}
      </section>
    </section>
  </main>;
}
