import Link from "next/link";

export default function HomePage() {
  return <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-blue-800">SEPLAG</p>
    <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Plataforma institucional de eventos</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Fundação institucional para cursos, workshops, congressos e eventos.</p>
    <nav className="mt-8 flex gap-4" aria-label="Acesso à plataforma">
      <Link className="rounded-md bg-blue-800 px-5 py-3 font-medium text-white hover:bg-blue-900" href="/login">Entrar</Link>
      <Link className="rounded-md border border-slate-300 px-5 py-3 font-medium hover:bg-slate-100" href="/cadastro">Criar conta</Link>
      <Link className="rounded-md border border-blue-200 px-5 py-3 font-medium text-blue-900 hover:bg-blue-50" href="/eventos">Ver eventos</Link>
    </nav>
  </main>;
}
