import type { EventInput } from "@backend/modules/events/event.schemas";

type Props = { action: (formData: FormData) => void | Promise<void>; submitLabel: string; eventoId?: string; initial?: Partial<Record<keyof EventInput, string | number | boolean | null>> };

export function EventForm({ action, submitLabel, eventoId, initial = {} }: Props) {
  const value = (key: keyof EventInput, fallback = "") => initial[key] == null ? fallback : String(initial[key]);
  return <form action={action} className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
    {eventoId && <input type="hidden" name="eventoId" value={eventoId} />}
    <label className="grid gap-1 text-sm font-medium">Título<input required maxLength={240} name="titulo" defaultValue={value("titulo")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Nicho / categoria<input required maxLength={120} name="nicho" defaultValue={value("nicho")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium md:col-span-2">Descrição<textarea required maxLength={20000} rows={5} name="descricao" defaultValue={value("descricao")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Início<input required type="datetime-local" name="dataInicio" defaultValue={value("dataInicio")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Término<input required type="datetime-local" name="dataTermino" defaultValue={value("dataTermino")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Modalidade<select name="modalidade" defaultValue={value("modalidade", "PRESENCIAL")} className="rounded-md border p-2"><option value="PRESENCIAL">Presencial</option><option value="ONLINE">Online</option><option value="HIBRIDO">Híbrido</option></select></label>
    <label className="grid gap-1 text-sm font-medium">Local<input maxLength={300} name="local" defaultValue={value("local")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Cidade<input maxLength={160} name="cidade" defaultValue={value("cidade")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">URL do Google Maps<input type="url" name="urlGoogleMaps" defaultValue={value("urlGoogleMaps")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Latitude<input type="number" step="any" min="-90" max="90" name="latitude" defaultValue={value("latitude")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Longitude<input type="number" step="any" min="-180" max="180" name="longitude" defaultValue={value("longitude")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Vagas totais<input required type="number" min="0" max="1000000" name="vagasTotais" defaultValue={value("vagasTotais", "0")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Carga horária<input required type="number" min="0.01" step="0.01" name="cargaHoraria" defaultValue={value("cargaHoraria")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Presença mínima (%)<input required type="number" min="0" max="100" step="0.01" name="percentualMinimoPresenca" defaultValue={value("percentualMinimoPresenca", "75")} className="rounded-md border p-2" /></label>
    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="aceitaSubmissaoTrabalhos" defaultChecked={Boolean(initial.aceitaSubmissaoTrabalhos)} /> Aceita submissão de trabalhos</label>
    <label className="grid gap-1 text-sm font-medium">Início das submissões<input type="datetime-local" name="inicioSubmissaoTrabalhos" defaultValue={value("inicioSubmissaoTrabalhos")} className="rounded-md border p-2" /></label>
    <label className="grid gap-1 text-sm font-medium">Fim das submissões<input type="datetime-local" name="fimSubmissaoTrabalhos" defaultValue={value("fimSubmissaoTrabalhos")} className="rounded-md border p-2" /></label>
    <div className="md:col-span-2"><button className="rounded-md bg-blue-800 px-5 py-2.5 font-semibold text-white hover:bg-blue-900">{submitLabel}</button></div>
  </form>;
}
