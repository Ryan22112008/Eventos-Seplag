import Link from "next/link";
import { loginAction } from "@backend/server/actions/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const error = query.erro === "rate" ? "Muitas tentativas. Aguarde alguns minutos e tente novamente." : query.erro ? "Credenciais inválidas." : null;
  const loggedOut = query.logout === "ok";
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
    <Link href="/" className="text-sm font-semibold text-blue-800">← Eventos SEPLAG</Link>
    <h1 className="mt-6 text-3xl font-bold">Entrar</h1>
    <p className="mt-2 text-slate-600">Acesse sua conta institucional.</p>
    {loggedOut && <p className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-900" role="status">Você saiu da sua conta.</p>}
    {error && <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</p>}
    <form action={loginAction} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">E-mail<input required type="email" name="email" autoComplete="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-medium">Senha<input required type="password" name="senha" autoComplete="current-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
      <button className="w-full rounded-md bg-blue-800 px-4 py-3 font-semibold text-white hover:bg-blue-900">Entrar</button>
    </form>
    <p className="mt-6 text-sm text-slate-600">Ainda não tem conta? <Link className="font-semibold text-blue-800 underline" href="/cadastro">Cadastre-se</Link></p>
  </main>;
}
