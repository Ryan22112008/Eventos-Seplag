import Link from "next/link";
import { requireRole } from "@backend/auth/access";
import { getOwnParticipationSummaries } from "@backend/modules/certificates/certificate-service";
import { AccountHeader } from "@frontend/components/account-header";

const situationLabel = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", NAO_CONCLUIDO: "Não concluído" } as const;
const formatDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Cuiaba" }).format(date);

export default async function ParticipantCertificatesPage() {
  const user = await requireRole("PARTICIPANTE");
  const summaries = await getOwnParticipationSummaries(user);
  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 sm:px-8">
    <AccountHeader user={user} />
    <Link href="/participante" className="mt-6 inline-block text-sm text-blue-800 underline">← Área do participante</Link>
    <header className="py-7"><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Conclusão de eventos</p><h1 className="mt-2 text-3xl font-bold">Frequência e certificados</h1><p className="mt-3 text-slate-600">A frequência é calculada pelo servidor. Os resultados definitivos aparecem após a consolidação do evento.</p></header>
    {summaries.length === 0 ? <section className="rounded-xl border bg-white p-5 text-slate-600">Você ainda não tem inscrições para acompanhar.</section> : <div className="grid gap-4">{summaries.map((item) => <article key={item.event.id} className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{item.event.titulo}</h2><p className="mt-1 text-sm text-slate-600">{formatDate(item.event.dataInicio)}–{formatDate(item.event.dataTermino)}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{situationLabel[item.summary.situacao]}</span></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Frequência</dt><dd className="font-semibold">{item.summary.sessoesPresentes}/{item.summary.totalSessoes} sessões · {item.summary.percentualFrequencia.toFixed(2)}%</dd></div><div><dt className="text-slate-500">Mínimo exigido</dt><dd className="font-semibold">{item.event.percentualMinimoPresenca.toString()}%</dd></div><div><dt className="text-slate-500">Inscrição</dt><dd className="font-semibold">{item.inscricaoStatus === "CANCELADA" ? "Cancelada" : "Válida"}</dd></div></dl>
      <div className="mt-4">{item.certificadoId ? <a href={`/api/participante/certificados/${item.certificadoId}`} className="inline-flex rounded-md bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900">Baixar certificado PDF</a> : <p className="text-sm text-slate-600">{item.summary.elegivel ? "Elegível; o certificado estará disponível após a consolidação." : "Certificado ainda não disponível."}</p>}</div>
    </article>)}</div>}
  </main>;
}
