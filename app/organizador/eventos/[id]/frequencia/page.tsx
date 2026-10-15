import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { getEventFrequencyReport } from "@backend/modules/certificates/certificate-service";
import { ConsolidateButton } from "@frontend/components/certificates/consolidate-button";
import { AccountHeader } from "@frontend/components/account-header";

const situationLabel: Record<string, string> = { EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", NAO_CONCLUIDO: "Não concluído" };
const formatDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Cuiaba" }).format(date);

export default async function EventFrequencyPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  const { id } = await params;
  let report: Awaited<ReturnType<typeof getEventFrequencyReport>>;
  try { report = await getEventFrequencyReport(actor, id); } catch { notFound(); }
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-8">
    <AccountHeader user={actor} />
    <Link href={`/organizador/eventos/${id}`} className="mt-6 inline-block text-sm text-blue-800 underline">← Voltar ao evento</Link>
    <header className="py-7"><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Frequência e conclusão</p><h1 className="mt-2 text-3xl font-bold">{report.event.titulo}</h1><p className="mt-2 text-slate-600">Mínimo exigido: {report.event.percentualMinimoPresenca}% · Sessões cadastradas são consideradas obrigatórias.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Participantes" value={report.totalParticipantes} /><Stat label="Concluídos" value={report.concluidos} /><Stat label="Não concluídos" value={report.naoConcluidos} /><Stat label="Certificados emitidos" value={report.certificadosEmitidos} /></div>
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold">Consolidar participações</h2>
      <p className="my-2 text-sm text-slate-600">A frequência usa as sessões do evento e as presenças registradas. A consolidação grava um resultado histórico e gera PDFs somente para participantes elegíveis.</p>
      {report.event.status !== "ENCERRADO" && <p className="mb-3 text-sm text-amber-900">Encerre o evento antes de consolidar.</p>}
      {report.event.presencaFinalizada && <p className="mb-3 text-sm text-slate-600">Os resultados desta consolidação são históricos e não mudam automaticamente.</p>}
      <ConsolidateButton eventId={id} disabled={report.event.presencaFinalizada || report.event.status !== "ENCERRADO"} />
    </section>
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-semibold">Participantes</h2>
      {report.participants.length === 0 ? <p className="mt-3 text-slate-600">Não há inscrições válidas para este evento.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[48rem] text-left text-sm"><thead><tr className="border-b text-slate-600"><th scope="col" className="py-3 pr-4">Participante</th><th scope="col" className="py-3 pr-4">Sessões</th><th scope="col" className="py-3 pr-4">Presenças</th><th scope="col" className="py-3 pr-4">Frequência</th><th scope="col" className="py-3 pr-4">Situação</th><th scope="col" className="py-3">Certificado</th></tr></thead><tbody>{report.participants.map((participant) => <tr key={participant.participanteId} className="border-b last:border-0"><td className="py-3 pr-4">{participant.nome}</td><td className="py-3 pr-4">{participant.totalSessoes}</td><td className="py-3 pr-4">{participant.sessoesPresentes}/{participant.totalSessoes}</td><td className="py-3 pr-4">{participant.percentualFrequencia.toFixed(2)}%</td><td className="py-3 pr-4">{situationLabel[participant.situacao]}</td><td className="py-3">{participant.certificadoId ? "Emitido" : "Não emitido"}</td></tr>)}</tbody></table></div>}
      <p className="mt-3 text-xs text-slate-500">Período do evento: {formatDate(report.event.dataInicio)}–{formatDate(report.event.dataTermino)}. Carga horária registrada: {report.event.cargaHoraria} h.</p>
    </section>
  </main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
