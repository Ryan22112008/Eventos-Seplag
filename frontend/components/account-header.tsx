import Link from "next/link";
import type { PerfilUsuario } from "@prisma/client";
import { logoutAction } from "@backend/server/actions/auth";

export function AccountHeader({ user }: { user: { nome: string; perfil: PerfilUsuario } }) {
  return <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
    <div>
      <Link href="/" className="font-semibold text-blue-900">Eventos SEPLAG</Link>
      <p className="mt-1 text-sm text-slate-600">{user.nome} · {user.perfil}</p>
    </div>
    <form action={logoutAction}><button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">Sair</button></form>
  </header>;
}
