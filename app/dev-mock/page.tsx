import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@backend/auth/session";
import { logoutDevMockAction } from "@backend/server/actions/dev-mock";
import { areaInicialDoPerfil, podeAcessarPerfil } from "@backend/auth/policy";
import { isDevMockMode } from "@backend/lib/dev-mode";
import { isDevMockProfile, type DevMockProfile } from "@backend/auth/dev-mock";

const navigation = {
  PARTICIPANTE: [
    ["/participante", "Visão geral"],
    ["/participante/check-in", "Presenças"],
    ["/participante/certificados", "Certificados"],
    ["/participante/trabalhos", "Meus trabalhos"],
    ["/participante/trabalhos/nova", "Submeter trabalho"],
    ["/participante/inscricoes/dev-inscricao/ingresso", "Ingresso"],
  ],
  ORGANIZADOR: [
    ["/organizador", "Visão geral"],
    ["/organizador/eventos", "Meus eventos"],
    ["/organizador/eventos/dev-evento", "Detalhes do evento"],
    ["/organizador/eventos/dev-evento/frequencia", "Frequência"],
    ["/organizador/eventos/dev-evento/metricas", "Métricas"],
    ["/organizador/eventos/dev-evento/trabalhos", "Trabalhos submetidos"],
    ["/organizador/eventos/dev-evento/sessoes/dev-sessao/check-in", "Check-in da sessão"],
  ],
  ADMIN: [
    ["/admin", "Visão geral"],
    ["/admin/solicitacoes-organizador", "Solicitações"],
    ["/admin/usuarios", "Usuários"],
    ["/organizador", "Área do organizador"],
  ],
  AVALIADOR: [
    ["/avaliador/trabalhos", "Trabalhos atribuídos"],
    ["/avaliador/trabalhos/dev-trabalho", "Avaliar trabalho"],
  ],
} as const;

const examples = {
  PARTICIPANTE: [
    ["Inscrição", "Seminário de Inovação Pública", "Confirmada"],
    ["Certificado", "Oficina de Dados Abertos", "Disponível"],
    ["Trabalho", "Tecnologia e serviço público", "Em avaliação"],
  ],
  ORGANIZADOR: [
    ["Evento", "Seminário de Inovação Pública", "Publicado · 42 inscritos"],
    ["Sessão", "Abertura e boas-vindas", "Hoje · 09:00"],
    ["Trabalho", "Tecnologia e serviço público", "Aguardando avaliador"],
  ],
  ADMIN: [
    ["Solicitação", "Organizador de demonstração", "Pendente"],
    ["Usuário", "Participante de demonstração", "Ativo"],
    ["Usuário", "Avaliador de demonstração", "Ativo"],
  ],
  AVALIADOR: [
    ["Trabalho", "Tecnologia e serviço público", "Aguardando avaliação"],
    ["Evento", "Seminário de Inovação Pública", "Publicado"],
  ],
} as const;

const labels = {
  PARTICIPANTE: "Participante",
  ORGANIZADOR: "Organizador",
  ADMIN: "Administrador",
  AVALIADOR: "Avaliador",
} as const;

function pageTitle(path: string, role: keyof typeof navigation): string {
  const current = navigation[role].find(([href]) => href === path);
  return current?.[1] ?? "Área de demonstração";
}

export default async function DevMockPage() {
  if (!isDevMockMode()) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile: unknown = user.perfil;
  if (!isDevMockProfile(profile)) redirect("/login");
  const role = profile;

  const requestHeaders = await headers();
  const path = requestHeaders.get("x-dev-mock-path") ?? "";
  const requiredProfiles: readonly DevMockProfile[] = path.startsWith("/admin")
    ? ["ADMIN"]
    : path.startsWith("/organizador")
      ? ["ORGANIZADOR", "ADMIN"]
      : path.startsWith("/avaliador")
        ? ["AVALIADOR"]
        : ["PARTICIPANTE"];

  if (!podeAcessarPerfil(role, requiredProfiles)) redirect(areaInicialDoPerfil(role));

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-950">
      Modo de desenvolvimento — dados fictícios; nenhuma informação é salva.
    </div>
    <header className="bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div>
          <Link href={areaInicialDoPerfil(role)} className="text-xl font-bold">Eventos SEPLAG</Link>
          <p className="mt-1 text-sm text-slate-300">{user.nome} · {labels[role]}</p>
        </div>
        <form action={logoutDevMockAction}>
          <button className="rounded border border-slate-500 px-4 py-2 text-sm hover:bg-slate-800">Sair</button>
        </form>
      </div>
      <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 px-5 pb-4" aria-label="Navegação da demonstração">
        {navigation[role].map(([href, label]) => (
          <Link key={href} href={href} className="rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">{label}</Link>
        ))}
      </nav>
    </header>
    <section className="mx-auto max-w-6xl px-5 py-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">{labels[role]}</p>
      <h1 className="mt-1 text-3xl font-bold">{pageTitle(path, role)}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Conteúdo de demonstração para navegação e desenvolvimento da interface. Ações de gravação e integrações com o banco não estão disponíveis neste modo.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {examples[role].map(([type, title, status]) => (
          <article key={`${type}-${title}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{type}</p>
            <h2 className="mt-2 font-semibold">{title}</h2>
            <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-900">{status}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-500">Os nomes, eventos, inscrições, usuários e status exibidos são inventados e existem somente nesta tela local.</p>
    </section>
  </main>;
}
