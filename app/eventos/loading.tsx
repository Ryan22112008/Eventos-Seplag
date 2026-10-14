export default function PublicEventsLoading() {
  return <main className="mx-auto min-h-screen max-w-7xl animate-pulse px-5 py-10 sm:px-8" aria-label="Carregando eventos">
    <div className="h-6 w-40 rounded bg-slate-200" />
    <div className="mt-10 h-10 w-64 rounded bg-slate-200" />
    <div className="mt-8 h-36 rounded-xl bg-slate-200" />
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-72 rounded-xl bg-slate-200" />)}</div>
  </main>;
}
