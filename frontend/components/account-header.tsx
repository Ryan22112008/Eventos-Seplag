import Link from "next/link";
import Image from "next/image";
import type { PerfilUsuario } from "@prisma/client";
import { logoutAction } from "@backend/server/actions/auth";
import { AccountNav } from "@frontend/components/account-nav";
import { isDevMockMode } from "@backend/lib/dev-mode";

const roleLabels: Record<PerfilUsuario, string> = {
  PARTICIPANTE: "Participante",
  ORGANIZADOR: "Organizador",
  ADMIN: "Administrador",
  AVALIADOR: "Avaliador",
};

const navigation: Partial<Record<PerfilUsuario, { href: string; label: string }[]>> = {
  PARTICIPANTE: [
    { href: "/participante", label: "Início" },
    { href: "/eventos", label: "Eventos" },
    { href: "/participante/check-in", label: "Presenças" },
    { href: "/participante/certificados", label: "Certificados" },
    { href: "/participante/trabalhos", label: "Trabalhos" },
    { href: "/participante/perfil", label: "Perfil" },
  ],
  ORGANIZADOR: [
    { href: "/organizador", label: "Visão geral" },
    { href: "/organizador/eventos", label: "Eventos" },
  ],
  ADMIN: [
    { href: "/admin", label: "Visão geral" },
    { href: "/admin/solicitacoes-organizador", label: "Organizadores" },
    { href: "/admin/usuarios", label: "Usuários" },
  ],
  AVALIADOR: [
    { href: "/avaliador/trabalhos", label: "Trabalhos atribuídos" },
  ],
};

export function AccountHeader({ user }: { user: { nome: string; perfil: PerfilUsuario } }) {
  const mockMode = isDevMockMode();
  const links = (navigation[user.perfil] ?? []).filter((item) => {
    if (!mockMode && item.href === "/participante/perfil") return false;
    return item.href.startsWith("/participante") || item.href.startsWith("/organizador") || item.href.startsWith("/admin") || item.href.startsWith("/avaliador");
  });
  return <header className="account-header">
    {mockMode && <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-950">Modo de desenvolvimento — dados fictícios; nenhuma informação é salva.</div>}
    <div className="account-topline">
      <Link href="/" className="account-brand" aria-label="Eventos SEPLAG, página inicial">
        <Image src="/logo-seplag-branco.png" alt="SEPLAG" width={487} height={541} className="seplag-logo" priority />
        <span>Eventos</span>
      </Link>
      <div className="account-user">
        <span className="account-user-name">{user.nome}</span>
        <span className="account-role">{roleLabels[user.perfil]}</span>
        <form action={logoutAction}><button className="account-logout">Sair</button></form>
      </div>
    </div>
    {links.length > 0 && <AccountNav links={links} />}
  </header>;
}
