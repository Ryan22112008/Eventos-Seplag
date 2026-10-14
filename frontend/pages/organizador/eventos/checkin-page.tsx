import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountHeader } from "@frontend/components/account-header";
import { SessionQrPanel } from "@frontend/components/attendance/session-qr-panel";
import { requireRole } from "@backend/auth/access";
import { getOrganizerSessionAttendance } from "@backend/modules/attendance/attendance-service";

const fmt = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Cuiaba" }).format(date);

export default async function OrganizerCheckinPage({ params }: { params: Promise<{ id: string; sessaoId: string }> }) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  const { id, sessaoId } = await params;
  let data: Awaited<ReturnType<typeof getOrganizerSessionAttendance>>;
  try { data = await getOrganizerSessionAttendance(actor, { eventoId: id, sessaoId }); }
  catch { notFound(); }
  if (!data) notFound();
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-8">
    <AccountHeader user={actor} />
    <Link href={`/organizador/eventos/${id}`} className="mt-6 inline-block text-sm text-blue-800 underline">← Voltar ao evento</Link>
    <header className="py-6"><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Controle de presença</p><h1 className="mt-2 text-3xl font-bold">{data.session.nome}</h1><p className="mt-2 text-slate-600">{data.event.titulo} · {fmt(data.session.inicio)}–{fmt(data.session.fim)}</p></header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Inscritos ativos" value={data.inscritos} /><Stat label="Presentes" value={data.presentes} /><Stat label="Ausentes" value={data.ausentes} /><Stat label="Presença" value={`${data.percentualPresenca}%`} /></div>
    <div className="mt-6"><SessionQrPanel eventoId={id} sessaoId={sessaoId} qrConfigured={data.session.qrConfigured} /></div>
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-semibold">Participantes da sessão</h2>{data.attendees.length === 0 ? <p className="mt-4 text-slate-600">Não há inscrições ativas neste evento.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-sm"><thead><tr className="border-b text-slate-600"><th scope="col" className="py-3 pr-4">Participante</th><th scope="col" className="py-3 pr-4">Inscrição</th><th scope="col" className="py-3 pr-4">Presença</th><th scope="col" className="py-3">Horário</th></tr></thead><tbody>{data.attendees.map((attendee) => <tr key={attendee.inscricaoId} className="border-b last:border-0"><td className="py-3 pr-4">{attendee.nome}</td><td className="py-3 pr-4">Ativa</td><td className="py-3 pr-4">{attendee.status === "PRESENTE" ? "Presente" : "Ausente"}</td><td className="py-3">{attendee.dataRegistro ? fmt(attendee.dataRegistro) : "—"}</td></tr>)}</tbody></table></div>}</section>
  </main>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
