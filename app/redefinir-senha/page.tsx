import Link from "next/link";
import { resetPasswordAction } from "@backend/server/actions/password-recovery";
import { AuthFrame } from "@frontend/components/auth-frame";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; resultado?: string }> }) {
  const params = await searchParams;
  const token = params.token ?? "";
  return <AuthFrame title="Definir nova senha" description="Escolha uma nova senha para sua conta.">{params.resultado === "invalid" && <p role="alert" className="mb-4 rounded bg-red-50 p-3">O link é inválido ou expirou. Solicite uma nova recuperação.</p>}<form action={resetPasswordAction}><input type="hidden" name="token" value={token} /><label>Nova senha<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="mt-1 w-full rounded border p-3" /></label><label>Confirme a nova senha<input name="confirmation" type="password" required minLength={12} maxLength={128} autoComplete="new-password" className="mt-1 w-full rounded border p-3" /></label><button disabled={token.length < 40 || token.length > 60} className="rounded bg-slate-900 px-4 py-3 text-white disabled:opacity-50">Alterar senha</button></form><Link className="mt-6 inline-block underline" href="/recuperar-senha">Solicitar outro link</Link></AuthFrame>;
}
