import Link from "next/link";
import Image from "next/image";

export function AuthFrame({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <main className="auth-layout">
    <section className="auth-card" aria-labelledby="auth-title">
      <Link href="/" className="public-brand auth-brand" aria-label="Eventos SEPLAG, página inicial">
        <Image src="/logo-seplag-branco.png" alt="SEPLAG" width={487} height={541} className="seplag-logo" priority />
        <span>Eventos</span>
      </Link>
      <div className="auth-heading"><p className="eyebrow">Acesso à plataforma</p><h1 id="auth-title">{title}</h1>{description && <p>{description}</p>}</div>
      {children}
      <Link href="/eventos" className="auth-back">← Voltar para eventos</Link>
    </section>
    <aside className="auth-aside" aria-label="Eventos SEPLAG">
      <Image src="/logo-seplag-branco.png" alt="SEPLAG" width={487} height={541} className="seplag-logo auth-aside-logo" priority />
      <p>Eventos</p>
      <span>Plataforma institucional de eventos</span>
    </aside>
  </main>;
}
