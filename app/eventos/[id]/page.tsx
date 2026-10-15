import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { getPublicEvent } from "@backend/modules/events/public-event-service";
import { registerForEventAction } from "@backend/server/actions/registrations";

const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Cuiaba" }).format(value);
const messages: Record<string, string> = { ok: "Inscrição confirmada. Você já está inscrito neste evento.", conflict: "Você já possui uma inscrição neste evento ou ela foi cancelada anteriormente.", invalid_state: "Este evento não possui mais vagas ou não aceita inscrições.", not_found: "Evento não encontrado ou indisponível.", unexpected: "Não foi possível realizar a inscrição." };

export default async function PublicEventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  const event = await getPublicEvent(id);
  if (!event) notFound();
  const feedback = typeof query.inscricao === "string" ? messages[query.inscricao] : undefined;
  const mapUrl = event.latitude !== null && event.longitude !== null
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${event.latitude},${event.longitude}`)}&output=embed`
    : event.urlGoogleMaps;
  return <main className="mx-auto min-h-screen max-w-5xl px-5 py-10 sm:px-8">
    <header className="public-page-header"><Link href="/" className="public-brand" aria-label="Página inicial Eventos SEPLAG"><Image src="/logo-seplag-branco.png" alt="SEPLAG" width={487} height={541} className="seplag-logo" priority /><span>Eventos</span></Link><Link href="/eventos" className="text-sm font-medium text-blue-800 hover:underline">← Todos os eventos</Link></header>
    {event.banner && <Image src={`/api/public/eventos/${id}/banner`} alt="" width={1920} height={900} className="mt-6 max-h-[28rem] w-full rounded-xl object-cover" />}
    <section className="py-8"><p className="font-medium text-blue-800">{event.nicho} · {event.modalidade.toLowerCase()}</p><h1 className="mt-2 text-4xl font-bold">{event.titulo}</h1><p className="mt-5 whitespace-pre-wrap leading-7 text-slate-700">{event.descricao}</p>
      {feedback && <p className="mt-5 rounded-md bg-blue-50 p-4 text-blue-950" role="status">{feedback}</p>}
      <div className="mt-6 grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2"><p><strong>Início</strong><br />{date(event.dataInicio)}</p><p><strong>Término</strong><br />{date(event.dataTermino)}</p><p><strong>Local</strong><br />{event.local ?? "A informar"}</p><p><strong>Cidade</strong><br />{event.cidade ?? "A informar"}</p><p><strong>Carga horária</strong><br />{Number(event.cargaHoraria)} horas</p><p><strong>Vagas disponíveis</strong><br />{event.vagasRestantes}</p></div>
      <div className="mt-6">{user?.perfil === "PARTICIPANTE" ? event.vagasRestantes > 0 ? <form action={registerForEventAction}><input type="hidden" name="eventoId" value={id} /><button className="rounded-md bg-blue-800 px-6 py-3 font-semibold text-white hover:bg-blue-900">Inscrever-se</button></form> : <p className="font-medium text-slate-600">As vagas foram preenchidas.</p> : user ? <p className="text-slate-600">A inscrição está disponível para participantes.</p> : <Link href="/login" className="inline-block rounded-md bg-blue-800 px-6 py-3 font-semibold text-white hover:bg-blue-900">Entrar para se inscrever</Link>}</div>
    </section>
    {event.disciplinas.length > 0 && <section className="border-t border-slate-200 py-7"><h2 className="text-2xl font-semibold">Disciplinas</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{event.disciplinas.map((item, index) => <li key={`${item.nome}-${index}`} className="rounded-lg bg-white p-4">{item.nome}<span className="block text-sm text-slate-600">{Number(item.cargaHoraria)} horas</span></li>)}</ul></section>}
    {mapUrl && <section className="border-t border-slate-200 py-7"><h2 className="text-2xl font-semibold">Localização</h2>{event.latitude !== null && event.longitude !== null ? <iframe title="Mapa do local do evento" src={mapUrl} loading="lazy" referrerPolicy="no-referrer" className="mt-4 h-80 w-full rounded-xl border-0" /> : <a className="mt-3 inline-block text-blue-800 underline" href={mapUrl} target="_blank" rel="noreferrer">Abrir localização no Google Maps</a>}</section>}
  </main>;
}
