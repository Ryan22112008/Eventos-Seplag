import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { isDevMockMode } from "@backend/lib/dev-mode";
import { getCertificateById, getEventById, DEV_MOCK_PARTICIPANT } from "@backend/lib/dev-mock-data";

const formatDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Cuiaba" }).format(date);
const formatDateTime = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Cuiaba" }).format(date);

export default async function VisualizarCertificadoPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDevMockMode()) redirect("/participante");
  const { id } = await params;
  const certificate = getCertificateById(id);
  if (!certificate) notFound();
  const event = getEventById(certificate.eventoId);
  if (!event) notFound();
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const validationUrl = `${baseUrl}/certificados/validar/${encodeURIComponent(certificate.codigoValidacao ?? "")}`;
  const qrDataUrl = await QRCode.toDataURL(validationUrl, { errorCorrectionLevel: "H", margin: 2, width: 400 });
  const emitedAt = new Date("2026-08-13T10:00:00");
  return (
    <main className="mx-auto min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-950">Modo de desenvolvimento — demonstração; sem validade oficial.</div>
      <Link href="/participante/certificados" className="mt-6 inline-block text-sm text-blue-800 underline">← Meus certificados</Link>
      <article className="mt-10 max-w-4xl mx-auto bg-white p-10 sm:p-16 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="border-4 border-blue-900 p-6 sm:p-10 rounded-xl">
            <div className="text-center mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">SEPLAG-MT · Planejamento e Gestão</p>
              <h2 className="mt-2 text-3xl font-extrabold text-blue-900 tracking-tight">Certificado de Demonstração</h2>
              <p className="mt-1 text-sm text-slate-500">Documento demonstrativo — sem validade oficial ou jurídica.</p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
              <div>
                <p className="text-slate-500 uppercase text-xs font-semibold">Participante</p>
                <p className="font-semibold">{DEV_MOCK_PARTICIPANT.nome}</p>
                <p className="text-slate-500">{DEV_MOCK_PARTICIPANT.cargo} · {DEV_MOCK_PARTICIPANT.instituicao}</p>
                <p className="text-slate-500">{DEV_MOCK_PARTICIPANT.cidade}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-xs font-semibold">Evento</p>
                <p className="font-semibold">{event.titulo}</p>
                <p className="text-slate-500">{event.local} · {event.cidade}</p>
                <p className="text-slate-500">{event.modalidade} · {event.nicho}</p>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 uppercase text-xs font-semibold">Situação</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${certificate.elegivel ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {certificate.elegivel ? "Certificado disponível" : "Certificado indisponível"}
                </span>
                {certificate.motivoIndisponibilidade && (
                  <p className="mt-1 text-xs text-slate-500">{certificate.motivoIndisponibilidade}</p>
                )}
              </div>
              <div>
                <p className="text-slate-500 uppercase text-xs font-semibold">Emissão</p>
                <p className="font-semibold">{formatDateTime(emitedAt)}</p>
              </div>
            </div>
            <div className="mt-12 border-t border-slate-200 pt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-slate-500 uppercase text-xs font-semibold">Código de validação</p>
                <p className="font-mono font-semibold text-slate-800">{certificate.codigoValidacao}</p>
                <p className="mt-1 text-xs text-slate-500">Valide em {new URL(validationUrl).host}</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-slate-500 uppercase text-xs font-semibold">QR de validação</p>
                <img src={qrDataUrl} alt="QR Code de validação" className="w-32 h-32" />
              </div>
            </div>
            <div className="mt-12 flex justify-end">
              <div className="w-64 border-b border-slate-400 pt-2 text-right">
                <p className="text-xs text-slate-500">Assinatura institucional (demonstração)</p>
                <p className="text-sm font-semibold text-slate-700">SEPLAG-MT</p>
              </div>
            </div>
          </div>
        </div>
      </article>
      <div className="mt-10 text-center text-xs text-slate-400">Eventos SEPLAG — Ambiente de demonstração. Dados fictícios, sem conexão com banco de dados.</div>
    </main>
  );
}