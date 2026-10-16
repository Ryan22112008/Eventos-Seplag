import { getPublicCertificate } from "@backend/modules/certificates/certificate-service";
import { isDevMockMode } from "@backend/lib/dev-mode";
import { DEV_MOCK_PARTICIPANT } from "@backend/lib/dev-mock-data";

const formatDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Cuiaba" }).format(date);

const DEMO_VALID_CODES = ["DEMO-2026-CONGRESSO-0001"];

export default async function ValidateCertificatePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (isDevMockMode()) {
    if (!DEMO_VALID_CODES.includes(codigo)) {
      return <main className="mx-auto min-h-screen max-w-2xl px-5 py-16"><section className="rounded-xl border border-slate-200 bg-white p-7"><p className="font-semibold text-slate-800">Certificado de demonstração não encontrado.</p><p className="mt-2 text-sm text-slate-600">Informe um código de demonstração válido, por exemplo DEMO-2026-CONGRESSO-0001.</p></section></main>;
    }
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-16">
        <section className="rounded-xl border border-green-200 bg-white p-7 shadow-sm">
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 mb-6">Modo de desenvolvimento — demonstração; sem validade oficial.</div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-800">Validação pública (demonstração)</p>
          <h1 className="mt-2 text-3xl font-bold text-green-950">Certificado válido (demonstração)</h1>
          <p className="mt-2 text-sm text-slate-500">Documento demonstrativo — sem validade oficial ou jurídica.</p>
          <dl className="mt-6 grid gap-4">
            <div><dt className="text-sm text-slate-500">Participante</dt><dd className="font-semibold">{DEV_MOCK_PARTICIPANT.nome}</dd></div>
            <div><dt className="text-sm text-slate-500">Evento</dt><dd className="font-semibold">Congresso de Inovação e Gestão Pública 2026</dd></div>
            <div><dt className="text-sm text-slate-500">Período</dt><dd>10 de agosto de 2026 – 12 de agosto de 2026</dd></div>
            <div><dt className="text-sm text-slate-500">Carga horária</dt><dd className="font-semibold">24 horas</dd></div>
            <div><dt className="text-sm text-slate-500">Frequência</dt><dd className="font-semibold">87,50%</dd></div>
            <div><dt className="text-sm text-slate-500">Data de emissão</dt><dd>13 de agosto de 2026</dd></div>
            <div><dt className="text-sm text-slate-500">Identificador</dt><dd className="font-mono text-sm">{codigo}</dd></div>
            <div><dt className="text-sm text-slate-500">Situação</dt><dd className="font-semibold text-green-800">Válida (ambiente de demonstração)</dd></div>
          </dl>
        </section>
      </main>
    );
  }
  const certificate = await getPublicCertificate(codigo);
  if (!certificate) return <main className="mx-auto min-h-screen max-w-2xl px-5 py-16"><section className="rounded-xl border border-slate-200 bg-white p-7"><p className="font-semibold text-slate-800">Certificado não encontrado.</p></section></main>;
  const { evento, participante } = certificate.conclusao;
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-16"><section className="rounded-xl border border-green-200 bg-white p-7 shadow-sm">
    <p className="text-sm font-semibold uppercase tracking-wide text-green-800">Validação pública</p><h1 className="mt-2 text-3xl font-bold text-green-950">Certificado válido</h1>
    <dl className="mt-6 grid gap-4"><div><dt className="text-sm text-slate-500">Participante</dt><dd className="font-semibold">{participante.nome}</dd></div><div><dt className="text-sm text-slate-500">Evento</dt><dd className="font-semibold">{evento.titulo}</dd></div><div><dt className="text-sm text-slate-500">Período</dt><dd>{formatDate(evento.dataInicio)}–{formatDate(evento.dataTermino)}</dd></div><div><dt className="text-sm text-slate-500">Carga horária</dt><dd>{evento.cargaHoraria.toString()} horas</dd></div><div><dt className="text-sm text-slate-500">Data de emissão</dt><dd>{formatDate(certificate.emitidoEm)}</dd></div><div><dt className="text-sm text-slate-500">Identificador</dt><dd className="font-mono text-sm">{certificate.codigo}</dd></div></dl>
  </section></main>;
}
