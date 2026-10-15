import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { getEventMetrics } from "@backend/modules/events/event-metrics-service";
import { DomainError } from "@backend/lib/errors";

function value(value: number | null, suffix = "") { return value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suffix}`; }

export default async function EventMetricsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  const { id } = await params;
  let metrics: Awaited<ReturnType<typeof getEventMetrics>>;
  try { metrics = await getEventMetrics(actor, id); }
  catch (error) { if (error instanceof DomainError && error.code === "FORBIDDEN") notFound(); notFound(); }
  const cards = [
    ["Inscrições", metrics.registrations.total], ["Ativas", metrics.registrations.active], ["Canceladas", metrics.registrations.cancelled],
    ["Capacidade", metrics.event.vagasTotais], ["Vagas restantes", metrics.event.vagasRestantes], ["Ocupação", value(metrics.occupancyRate, "%")],
    ["Participantes presentes", metrics.participantsPresent], ["Sessões", metrics.sessions], ["Taxa de presença", value(metrics.attendanceRate, "%")],
    ["Concluíram", metrics.attendance.concluded], ["Taxa de conclusão", value(metrics.attendance.concludedRate, "%")], ["Certificados emitidos", metrics.certificates],
    ["Trabalhos submetidos (total)", metrics.works.total], ["Aguardando atribuição", metrics.works.submitted], ["Em avaliação", metrics.works.inReview], ["Aprovados", metrics.works.approved], ["Rejeitados", metrics.works.rejected],
  ] as const;
  return <main className="mx-auto max-w-6xl px-6 py-10"><Link className="text-sm underline" href={`/organizador/eventos/${id}`}>Voltar ao evento</Link><h1 className="mt-4 text-3xl font-semibold">Métricas: {metrics.event.titulo}</h1><p className="mt-2 text-sm text-slate-600">Taxas usam inscrições ativas como base para ocupação e presença. Conclusão considera inscrições elegíveis (ativas ou concluídas) e o cálculo de frequência atual. {metrics.attendanceFinalized ? "A frequência está consolidada." : "A frequência ainda é calculada ao vivo."}</p><section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, amount]) => <article key={label} className="rounded-lg border bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-semibold">{typeof amount === "number" ? value(amount) : amount}</p></article>)}</section></main>;
}
