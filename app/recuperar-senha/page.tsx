import Link from "next/link";
import { requestPasswordRecoveryAction } from "@backend/server/actions/password-recovery";
import { AuthFrame } from "@frontend/components/auth-frame";

export default async function RecoverPasswordPage({ searchParams }: { searchParams: Promise<{ resultado?: string }> }) {
  const params = await searchParams;
  return <AuthFrame title="Recuperar senha" description="Informe seu e-mail. Se houver uma conta ativa, enviaremos instruções.">{params.resultado === "ok" && <p role="status" className="mb-4 rounded bg-emerald-50 p-3">Se o endereço estiver cadastrado, você receberá um e-mail com as instruções.</p>}<form action={requestPasswordRecoveryAction}><label>E-mail<input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded border p-3" /></label><button className="rounded bg-slate-900 px-4 py-3 text-white">Enviar instruções</button></form><Link className="mt-6 inline-block underline" href="/login">Voltar ao login</Link></AuthFrame>;
}
