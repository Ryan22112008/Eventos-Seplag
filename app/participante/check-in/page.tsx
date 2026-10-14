import { AccountHeader } from "@frontend/components/account-header";
import { CheckinScanner } from "@frontend/components/attendance/checkin-scanner";
import { requireRole } from "@backend/auth/access";
import { listOwnPresences } from "@backend/modules/attendance/attendance-service";

export default async function ParticipantCheckinPage() {
  const user = await requireRole("PARTICIPANTE");
  const presences = await listOwnPresences(user);
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8">
    <AccountHeader user={user} />
    <header className="py-8"><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Presença por sessão</p><h1 className="mt-2 text-3xl font-bold">Fazer check-in</h1><p className="mt-3 text-slate-600">Abra a câmera e leia o QR Code temporário exibido pelo organizador durante a sessão. Sua inscrição ativa e o horário são validados no servidor.</p></header>
    <CheckinScanner />
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-semibold">Minhas presenças</h2>{presences.length === 0 ? <p className="mt-3 text-slate-600">As presenças registradas nas suas sessões aparecerão aqui.</p> : <ul className="mt-3 divide-y divide-slate-200">{presences.map((presence, index) => <li key={`${presence.sessao.nome}-${presence.dataRegistro?.toISOString() ?? index}`} className="py-3"><p className="font-medium">{presence.sessao.evento.titulo} · {presence.sessao.nome}</p><p className="text-sm text-slate-600">{presence.status === "PRESENTE" ? "Presente" : presence.status === "JUSTIFICADA" ? "Justificada" : "Falta"} · {presence.dataRegistro ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Cuiaba" }).format(presence.dataRegistro) : "Horário não registrado"}</p></li>)}</ul>}</section>
  </main>;
}
