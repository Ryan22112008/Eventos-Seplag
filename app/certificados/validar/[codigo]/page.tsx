import { getPublicCertificate } from "@backend/modules/certificates/certificate-service";

const formatDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Cuiaba" }).format(date);

export default async function ValidateCertificatePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const certificate = await getPublicCertificate(codigo);
  if (!certificate) return <main className="mx-auto min-h-screen max-w-2xl px-5 py-16"><section className="rounded-xl border border-slate-200 bg-white p-7"><p className="font-semibold text-slate-800">Certificado não encontrado.</p></section></main>;
  const { evento, participante } = certificate.conclusao;
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-16"><section className="rounded-xl border border-green-200 bg-white p-7 shadow-sm">
    <p className="text-sm font-semibold uppercase tracking-wide text-green-800">Validação pública</p><h1 className="mt-2 text-3xl font-bold text-green-950">Certificado válido</h1>
    <dl className="mt-6 grid gap-4"><div><dt className="text-sm text-slate-500">Participante</dt><dd className="font-semibold">{participante.nome}</dd></div><div><dt className="text-sm text-slate-500">Evento</dt><dd className="font-semibold">{evento.titulo}</dd></div><div><dt className="text-sm text-slate-500">Período</dt><dd>{formatDate(evento.dataInicio)}–{formatDate(evento.dataTermino)}</dd></div><div><dt className="text-sm text-slate-500">Carga horária</dt><dd>{evento.cargaHoraria.toString()} horas</dd></div><div><dt className="text-sm text-slate-500">Data de emissão</dt><dd>{formatDate(certificate.emitidoEm)}</dd></div><div><dt className="text-sm text-slate-500">Identificador</dt><dd className="font-mono text-sm">{certificate.codigo}</dd></div></dl>
  </section></main>;
}
