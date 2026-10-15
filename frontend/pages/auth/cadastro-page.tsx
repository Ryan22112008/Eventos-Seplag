import Link from "next/link";
import { registerAction } from "@backend/server/actions/auth";
import { AuthFrame } from "@frontend/components/auth-frame";

export default async function CadastroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const message = query.erro === "rate" ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
    : query.erro === "unavailable" ? "Não foi possível concluir o cadastro com os dados informados."
    : query.erro ? "Confira os campos e tente novamente. A senha precisa ter ao menos 12 caracteres."
    : null;
  return <AuthFrame title="Criar conta" description="Sua conta começa com perfil de participante.">
    {message && <p className="mt-5 rounded-md bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p>}
    <form action={registerAction} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">Nome<input required minLength={2} maxLength={160} name="nome" autoComplete="name" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-medium">E-mail<input required type="email" name="email" autoComplete="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-medium">Senha<input required minLength={12} maxLength={128} type="password" name="senha" autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /><span className="mt-1 block text-xs text-slate-500">Use pelo menos 12 caracteres.</span></label>
      <label className="block text-sm font-medium">Confirme a senha<input required minLength={12} maxLength={128} type="password" name="confirmarSenha" autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="queroSerOrganizador" className="mt-1" /><span>Quero solicitar perfil de organizador. A solicitação será analisada pela administração; minha conta continuará como participante até a aprovação.</span></label>
      <button className="w-full rounded-md bg-blue-800 px-4 py-3 font-semibold text-white hover:bg-blue-900">Criar conta</button>
    </form>
    <p className="mt-6 text-sm text-slate-600">Já tem conta? <Link className="font-semibold text-blue-800 underline" href="/login">Entrar</Link></p>
  </AuthFrame>;
}
