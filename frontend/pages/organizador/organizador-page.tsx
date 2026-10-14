import { AccountHeader } from "@frontend/components/account-header";
import { requireOrganizer } from "@backend/auth/access";
import Link from "next/link";

export default async function OrganizerPage() {
  const user = await requireOrganizer();
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <AccountHeader user={user} />
    <section className="py-10"><h1 className="text-3xl font-bold">Área do organizador</h1>
      <p className="mt-4 text-slate-600">Seu perfil de organizador está ativo.</p>
      <Link href="/organizador/eventos" className="mt-6 inline-flex rounded-md bg-blue-800 px-4 py-2.5 font-semibold text-white">Gerenciar eventos</Link>
    </section>
  </main>;
}
