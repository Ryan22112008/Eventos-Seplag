import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { prisma } from "@backend/lib/prisma";
import { AccountHeader } from "@frontend/components/account-header";
import { TicketQr } from "@frontend/components/attendance/ticket-qr";
import { getRegistrationById, getEventById } from "@backend/lib/dev-mock-data";
import { isDevMockMode } from "@backend/lib/dev-mode";

const formatDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Cuiaba" }).format(date);

type TicketViewRegistration = {
  id: string;
  status: string;
  createdAt: Date;
  eventoId: string;
  participanteId: string;
};
type TicketViewEvent = {
  id: string;
  titulo: string;
  descricao: string;
  dataInicio: Date;
  dataTermino: Date;
  local: string;
  cidade: string;
};

export default async function ParticipantTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("PARTICIPANTE");
  const { id } = await params;

  let registration: TicketViewRegistration | null = null;
  let event: TicketViewEvent | null = null;

  if (isDevMockMode()) {
    registration = getRegistrationById(id) ?? null;
    if (!registration || registration.participanteId !== user.id) notFound();
    event = getEventById(registration.eventoId) ?? null;
    if (!event) notFound();
  } else {
    const found = await prisma.inscricao.findFirst({ where: { id, participanteId: user.id }, select: { id: true, status: true, createdAt: true, evento: { select: { id: true, titulo: true, descricao: true, dataInicio: true, dataTermino: true, local: true, cidade: true } } } });
    if (!found) notFound();
    registration = { ...found, eventoId: found.evento.id, participanteId: user.id } as unknown as TicketViewRegistration;
    event = found.evento as unknown as TicketViewEvent;
  }

  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 sm:px-8">
    <AccountHeader user={user} />
    <Link href="/participante" className="mt-6 inline-block text-sm text-blue-800 underline">← Minhas inscrições</Link>
    <header className="py-6"><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Ingresso digital</p><h1 className="mt-2 text-3xl font-bold">{event!.titulo}</h1></header>
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <p><strong>Participante</strong><br />{user.nome}</p><p><strong>Status da inscrição</strong><br />{registration!.status === "ATIVA" ? "Ativa" : registration!.status === "CANCELADA" ? "Cancelada" : "Concluída"}</p>
      <p><strong>Data e horário</strong><br />{formatDate(event!.dataInicio)}<br />até {formatDate(event!.dataTermino)}</p><p><strong>Local</strong><br />{[event!.local, event!.cidade].filter(Boolean).join(" · ") || "A informar"}</p>
      <p className="sm:col-span-2"><strong>Sobre o evento</strong><br /><span className="mt-1 block whitespace-pre-line text-slate-700">{event!.descricao.slice(0, 400)}{event!.descricao.length > 400 ? "…" : ""}</span></p>
      <p className="text-sm text-slate-500">Inscrição realizada em {formatDate(registration!.createdAt)}.</p>
    </section>
    {registration!.status === "ATIVA" ? <div className="mt-6"><TicketQr registrationId={registration!.id} /><p className="mt-4 text-sm text-slate-600">Para registrar presença em uma sessão, use a opção <Link href="/participante/check-in" className="font-medium text-blue-800 underline">Fazer check-in</Link> e escaneie o QR Code temporário mostrado pelo organizador.</p></div> : <p className="mt-6 rounded-md bg-amber-50 p-4 text-amber-950" role="status">Uma inscrição cancelada ou concluída não gera um QR Code utilizável.</p>}
  </main>;
}
