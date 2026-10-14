import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { prisma } from "@backend/lib/prisma";
import { AccountHeader } from "@frontend/components/account-header";
import { TicketQr } from "@frontend/components/attendance/ticket-qr";

const formatDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Cuiaba" }).format(date);

export default async function ParticipantTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("PARTICIPANTE");
  const { id } = await params;
  const registration = await prisma.inscricao.findFirst({ where: { id, participanteId: user.id }, select: {
    id: true, status: true, createdAt: true,
    evento: { select: { titulo: true, descricao: true, dataInicio: true, dataTermino: true, local: true, cidade: true } },
  } });
  if (!registration) notFound();
  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 sm:px-8">
    <AccountHeader user={user} />
    <Link href="/participante" className="mt-6 inline-block text-sm text-blue-800 underline">← Minhas inscrições</Link>
    <header className="py-6"><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Ingresso digital</p><h1 className="mt-2 text-3xl font-bold">{registration.evento.titulo}</h1></header>
    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <p><strong>Participante</strong><br />{user.nome}</p><p><strong>Status da inscrição</strong><br />{registration.status === "ATIVA" ? "Ativa" : registration.status === "CANCELADA" ? "Cancelada" : "Concluída"}</p>
      <p><strong>Data e horário</strong><br />{formatDate(registration.evento.dataInicio)}<br />até {formatDate(registration.evento.dataTermino)}</p><p><strong>Local</strong><br />{[registration.evento.local, registration.evento.cidade].filter(Boolean).join(" · ") || "A informar"}</p>
      <p className="sm:col-span-2"><strong>Sobre o evento</strong><br /><span className="mt-1 block whitespace-pre-line text-slate-700">{registration.evento.descricao.slice(0, 400)}{registration.evento.descricao.length > 400 ? "…" : ""}</span></p>
      <p className="text-sm text-slate-500">Inscrição realizada em {formatDate(registration.createdAt)}.</p>
    </section>
    {registration.status === "ATIVA" ? <div className="mt-6"><TicketQr registrationId={registration.id} /><p className="mt-4 text-sm text-slate-600">Para registrar presença em uma sessão, use a opção <Link href="/participante/check-in" className="font-medium text-blue-800 underline">Fazer check-in</Link> e escaneie o QR Code temporário mostrado pelo organizador.</p></div> : <p className="mt-6 rounded-md bg-amber-50 p-4 text-amber-950" role="status">Uma inscrição cancelada ou concluída não gera um QR Code utilizável.</p>}
  </main>;
}
