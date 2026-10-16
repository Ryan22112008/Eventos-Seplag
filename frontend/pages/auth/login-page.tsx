import Link from "next/link";
import { loginAction } from "@backend/server/actions/auth";
import { loginAsDevMockAction } from "@backend/server/actions/dev-mock";
import { DEV_MOCK_PROFILES } from "@backend/auth/dev-mock";
import { isDevMockMode } from "@backend/lib/dev-mode";
import { AuthFrame } from "@frontend/components/auth-frame";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const error = query.erro === "rate" ? "Muitas tentativas. Aguarde alguns minutos e tente novamente." : query.erro ? "Credenciais inválidas." : null;
  const loggedOut = query.logout === "ok";
  const passwordChanged = query.senha === "alterada";
  const devMockMode = isDevMockMode();
  return <AuthFrame title="Entrar" description="Acesse sua conta institucional.">
    {loggedOut && <p className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-900" role="status">Você saiu da sua conta.</p>}
    {passwordChanged && <p className="mt-5 rounded-md bg-green-50 p-3 text-sm text-green-900" role="status">Senha alterada. Entre com a nova senha.</p>}
    {error && <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</p>}
    {devMockMode ? <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4" aria-label="Modo de desenvolvimento">
      <h2 className="font-semibold text-amber-950">Modo de desenvolvimento</h2>
      <p className="mt-1 text-sm text-amber-900">Acesse com um perfil fictício. Nenhum dado será salvo.</p>
      <div className="mt-4 grid gap-2">
        {(Object.keys(DEV_MOCK_PROFILES) as (keyof typeof DEV_MOCK_PROFILES)[]).map((profile) => (
          <form action={loginAsDevMockAction} key={profile}>
            <input type="hidden" name="profile" value={profile} />
            <button className="w-full rounded-md bg-blue-800 px-4 py-3 font-semibold text-white hover:bg-blue-900">
              Entrar como {DEV_MOCK_PROFILES[profile].perfil === "ADMIN" ? "Administrador" : profile.charAt(0) + profile.slice(1).toLowerCase()}
            </button>
          </form>
        ))}
      </div>
    </section> : <>
      <form action={loginAction} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">E-mail<input required type="email" name="email" autoComplete="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium">Senha<input required type="password" name="senha" autoComplete="current-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" /></label>
        <button className="w-full rounded-md bg-blue-800 px-4 py-3 font-semibold text-white hover:bg-blue-900">Entrar</button>
      </form>
      <p className="mt-3 text-sm"><Link className="text-blue-800 underline" href="/recuperar-senha">Esqueci minha senha</Link></p>
      <p className="mt-6 text-sm text-slate-600">Ainda não tem conta? <Link className="font-semibold text-blue-800 underline" href="/cadastro">Cadastre-se</Link></p>
    </>}
  </AuthFrame>;
}
