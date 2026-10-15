import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return <main className="public-home">
    <header className="public-header">
      <Link href="/" className="public-brand" aria-label="Eventos SEPLAG, página inicial">
        <Image src="/logo-seplag-branco.png" alt="SEPLAG" width={487} height={541} className="seplag-logo" priority />
        <span>Eventos</span>
      </Link>
      <nav aria-label="Navegação principal">
        <Link href="/eventos">Eventos</Link>
        <Link href="/login">Entrar</Link>
        <Link href="/cadastro" className="button-primary">Criar conta</Link>
      </nav>
    </header>

    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-hero-content">
        <p className="eyebrow">Plataforma institucional</p>
        <h1 id="home-title">Eventos que ampliam conhecimento e colaboração.</h1>
        <p className="home-lede">Um espaço para cursos, workshops, congressos e eventos institucionais.</p>
        <div className="home-actions">
          <Link className="button-primary" href="/eventos">Explorar eventos <span aria-hidden="true">→</span></Link>
          <Link className="button-secondary" href="/cadastro">Criar conta</Link>
        </div>
      </div>
      <div className="home-hero-note" aria-label="Acesso à plataforma">
        <span className="home-note-index">SEPLAG</span>
        <p>Informação, formação e encontros em um só lugar.</p>
      </div>
    </section>

    <section className="home-events" aria-labelledby="events-title">
      <div>
        <p className="eyebrow">Agenda aberta</p>
        <h2 id="events-title">Encontre seu próximo evento</h2>
        <p>Consulte a programação disponível e encontre atividades por tema, cidade e modalidade.</p>
      </div>
      <Link className="text-link" href="/eventos">Ver todos os eventos <span aria-hidden="true">→</span></Link>
    </section>

    <footer className="public-footer">
      <span>Eventos SEPLAG</span>
      <nav aria-label="Links institucionais"><Link href="/eventos">Eventos</Link><Link href="/login">Acessar conta</Link></nav>
    </footer>
  </main>;
}
