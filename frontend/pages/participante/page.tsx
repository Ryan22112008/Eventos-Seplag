import Link from "next/link";
import { StatusSolicitacaoOrganizador } from "@prisma/client";
import { AccountHeader } from "@frontend/components/account-header";
import { requireRole } from "@backend/auth/access";
import { prisma } from "@backend/lib/prisma";
import { requestOrganizerAction } from "@backend/server/actions/auth";
import { cancelOwnRegistrationAction } from "@backend/server/actions/registrations";
import { isDevMockMode } from "@backend/lib/dev-mode";
import {
  getEventById,
  getRegistrationsByParticipant,
  getParticipationSummaries,
  getScientificWorksByParticipant,
  getNotifications,
} from "@backend/lib/dev-mock-data";

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
  if (isDevMockMode()) {
    const registrations = getRegistrationsByParticipant(user.id);
    const activeRegistrations = registrations.filter((r) => r.status === "ATIVA");
    const summaries = getParticipationSummaries(user.id);
    const concludedEvents = summaries.filter((s) => s.event.status === "ENCERRADO");
    const upcomingEvents = summaries.filter((s) => s.event.status === "PUBLICADO");
    const certificadosDisponiveis = summaries.filter((s) => Boolean(s.certificadoId)).length;
    const frequenciaMedia =
      concludedEvents.length > 0
        ? Math.round((concludedEvents.reduce((acc, s) => acc + s.summary.percentualFrequencia, 0) / concludedEvents.length) * 100) / 100
        : 0;
    const works = getScientificWorksByParticipant(user.id);
    const notifications = getNotifications();
    const formatDate = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Cuiaba" }).format(value);
    const conf: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-800", indigo: "bg-indigo-50 border-indigo-200 text-indigo-800", green: "bg-green-50 border-green-200 text-green-800", emerald: "bg-emerald-50 border-emerald-200 text-emerald-800", amber: "bg-amber-50 border-amber-200 text-amber-800", purple: "bg-purple-50 border-purple-200 text-purple-800" };
    const ResumoCard = ({ title, value, subtitle, color }: { title: string; value: React.ReactNode; subtitle: string; color: string }) => {
      const c = conf[color] ?? conf.blue;
      return <article className={`rounded-xl border p-4 ${c}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-600">{subtitle}</p></article>;
    };
    const QuickLink = ({ href, title, action }: { href: string; title: string; action: string }) => <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors"><p className="text-sm text-slate-500">{title}</p><p className="mt-1 font-semibold text-slate-900">{action}</p></Link>;
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
        <AccountHeader user={user} />
        <section className="py-10">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div><h1 className="text-3xl font-bold">Área do participante</h1><p className="mt-1 text-slate-600">Bem-vinda, {user.nome}. Acompanhe inscrições, presenças, frequência e certificados.</p></div>
            <Link href="/eventos" className="mt-2 inline-block rounded-md bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900">Explorar eventos</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-10">
            <ResumoCard title="Eventos inscritos" value={activeRegistrations.length} subtitle="Inscrições ativas" color="blue" />
            <ResumoCard title="Próximos eventos" value={upcomingEvents.length} subtitle="Com inscrição ativa" color="indigo" />
            <ResumoCard title="Eventos concluídos" value={concludedEvents.length} subtitle="Frequência apurada" color="green" />
            <ResumoCard title="Certificados disponíveis" value={certificadosDisponiveis} subtitle="Pronto para visualizar" color="emerald" />
            <ResumoCard title="Frequência média" value={`${frequenciaMedia.toFixed(2)}%`} subtitle="Nos eventos concluídos" color="amber" />
            <ResumoCard title="Trabalhos científicos" value={works.length} subtitle={works.length > 0 ? "1 em avaliação" : "Nenhum"} color="purple" />
          </div>
          <section className="mb-10 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold">Notificações</h2><Link href="/participante/certificados" className="text-sm text-blue-800 underline hover:text-blue-900">Ver certificados</Link></div>
            <div className="space-y-3">{notifications.map((item) => <article key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${item.lida ? "border-slate-200 bg-white text-slate-700" : "border-blue-100 bg-blue-50 text-slate-900"}`}>{!item.lida && <span className="mt-0.5 w-2 h-2 rounded-full bg-blue-800" />}<div><p className="font-medium text-sm">{item.titulo}</p><p className="text-sm text-slate-600">{item.corpo}</p><p className="mt-1 text-xs text-slate-400">{formatDate(item.criadoEm)}</p></div>{item.link && <Link href={item.link} className="mt-1 text-sm font-medium text-blue-800 underline">Acessar</Link>}</article>)}</div>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold mb-4">Minhas inscrições</h2>
            {activeRegistrations.length === 0 ? <p className="text-slate-600">Você não possui inscrições ativas.</p> : <ul className="divide-y divide-slate-200">{activeRegistrations.map((registration) => { const event = getEventById(registration.eventoId); const summary = summaries.find((s) => s.inscricaoId === registration.id); return <li key={registration.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href={`/eventos/${event?.id}`} className="font-medium text-blue-900 hover:underline">{event?.titulo}</Link><p className="mt-1 text-sm text-slate-600">{formatDate(event?.dataInicio ?? new Date())} · {registration.status.toLowerCase()}</p>{summary && summary.summary.totalSessoes > 0 && <p className="mt-1 text-sm text-slate-600">Frequência: {summary.summary.percentualFrequencia.toFixed(2)}%</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/participante/inscricoes/${registration.id}/ingresso`} className="text-sm font-medium text-blue-800 underline">Ver ingresso</Link><Link href="/participante/check-in" className="text-sm font-medium text-blue-800 underline">Presenças</Link></div></div></li>; })}</ul>}
            <p className="mt-4 text-sm text-slate-500">Inscrição cancelada: <em>Seminário de Gestão e Tecnologia (não gera certificado)</em>.</p>
          </section>
          <section className="mt-10 grid gap-3 sm:grid-cols-3"><QuickLink href="/participante/check-in" title="Presenças" action="Fazer check-in" /><QuickLink href="/participante/certificados" title="Certificados" action="Visualizar certificado" /><QuickLink href="/participante/trabalhos" title="Trabalhos científicos" action="Acompanhar submissões" /><QuickLink href="/participante/perfil" title="Perfil" action="Dados cadastrais" /><QuickLink href="/eventos" title="Eventos" action="Explorar agenda pública" /><QuickLink href="/participante/certificados" title="Situação" action="Ver todos os certificados" /></section>
        </section>
      </main>
    );
  }

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
