import Link from "next/link";
import Image from "next/image";
import { listPublicEvents } from "@backend/modules/events/public-event-service";

const modalities = [{ value: "PRESENCIAL", label: "Presencial" }, { value: "ONLINE", label: "Online" }, { value: "HIBRIDO", label: "Híbrido" }];
const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Cuiaba" }).format(value);

export default async function PublicEventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const result = await listPublicEvents(params);
  const fields = Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string");
  function pageHref(page: number) { const next = new URLSearchParams(fields); next.set("page", String(page)); return `/eventos?${next.toString()}`; }
  return <main className="mx-auto min-h-screen max-w-7xl px-5 py-10 sm:px-8">
    <header className="public-header"><Link href="/" className="public-brand" aria-label="Eventos SEPLAG, página inicial"><Image src="/logo-seplag-branco.png" alt="SEPLAG" width={487} height={541} className="seplag-logo" priority /><span>Eventos</span></Link><nav aria-label="Navegação principal"><Link href="/login">Entrar</Link><Link href="/cadastro" className="button-primary">Criar conta</Link></nav></header>
    <section className="py-10"><p className="text-sm font-semibold uppercase tracking-widest text-blue-800">Agenda aberta</p><h1 className="mt-2 text-4xl font-bold">Eventos</h1><p className="mt-3 text-slate-600">Encontre cursos, workshops, congressos e outras atividades.</p></section>
    <form action="/eventos" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="sm:col-span-2">Buscar<input name="q" defaultValue={typeof params.q === "string" ? params.q : ""} placeholder="Título, descrição, nicho ou cidade" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label>Nicho<input name="nicho" defaultValue={typeof params.nicho === "string" ? params.nicho : ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label>Modalidade<select name="modalidade" defaultValue={typeof params.modalidade === "string" ? params.modalidade : ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"><option value="">Todas</option>{modalities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Cidade<input name="cidade" defaultValue={typeof params.cidade === "string" ? params.cidade : ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label>Data inicial<input type="date" name="dataDe" defaultValue={typeof params.dataDe === "string" ? params.dataDe : ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label>Data final<input type="date" name="dataAte" defaultValue={typeof params.dataAte === "string" ? params.dataAte : ""} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="flex items-center gap-2 self-end pb-2"><input type="checkbox" name="futuro" value="true" defaultChecked={params.futuro === "true"} />Somente eventos futuros</label>
      <div className="flex items-end gap-3"><button className="rounded-md bg-blue-800 px-4 py-2 font-semibold text-white hover:bg-blue-900">Filtrar</button><Link href="/eventos" className="py-2 text-sm text-slate-600 underline">Limpar</Link></div>
    </form>
    {!result.valid && <p className="mt-6 rounded-md bg-amber-50 p-4 text-amber-950" role="alert">Os filtros informados são inválidos. Revise as datas e os valores.</p>}
    {result.valid && <>
      {result.events.length === 0 ? <p className="mt-8 rounded-xl bg-white p-8 text-center text-slate-600">Nenhum evento publicado encontrado com esses filtros.</p> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.events.map((event) => <article key={event.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {event.banner ? <Image src={`/api/public/eventos/${event.id}/banner`} alt="" width={1200} height={675} className="h-44 w-full object-cover" /> : <div className="flex h-44 items-center justify-center bg-blue-50 text-blue-900">SEPLAG</div>}
        <div className="p-5"><p className="text-sm text-slate-600">{date(event.dataInicio)} · {event.modalidade.toLowerCase()}</p><h2 className="mt-2 text-xl font-semibold"><Link href={`/eventos/${event.id}`} className="hover:text-blue-800 hover:underline">{event.titulo}</Link></h2>
          <p className="mt-2 line-clamp-3 text-sm text-slate-600">{event.descricao}</p><p className="mt-4 text-sm">{[event.cidade, event.nicho].filter(Boolean).join(" · ")}</p><p className="mt-1 text-sm text-slate-600">{event.vagasRestantes} vagas · {Number(event.cargaHoraria)} horas</p><Link href={`/eventos/${event.id}`} className="mt-4 inline-block font-semibold text-blue-800">Ver detalhes →</Link></div>
      </article>)}</div>}
      {result.totalPages > 1 && <nav aria-label="Paginação" className="mt-8 flex justify-center gap-4"><Link aria-disabled={result.page <= 1} className={`rounded border px-4 py-2 ${result.page <= 1 ? "pointer-events-none opacity-40" : ""}`} href={pageHref(result.page - 1)}>Anterior</Link><span className="py-2">Página {result.page} de {result.totalPages}</span><Link aria-disabled={result.page >= result.totalPages} className={`rounded border px-4 py-2 ${result.page >= result.totalPages ? "pointer-events-none opacity-40" : ""}`} href={pageHref(result.page + 1)}>Próxima</Link></nav>}
    </>}
  </main>;
}
