"use client";

import { useActionState } from "react";
import { consolidateEventAction, type ConsolidationActionState } from "@backend/server/actions/certificates";

const initialState: ConsolidationActionState = { status: "idle" };

export function ConsolidateButton({ eventId, disabled }: { eventId: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(consolidateEventAction, initialState);
  return <div>
    {!disabled && <form action={action} onSubmit={(event) => { if (!window.confirm("A consolidação registra os resultados definitivos e emite os certificados elegíveis. Deseja continuar?")) event.preventDefault(); }}>
      <input type="hidden" name="eventoId" value={eventId} />
      <button type="submit" disabled={pending} className="rounded-md bg-blue-800 px-4 py-3 font-semibold text-white disabled:opacity-60">{pending ? "Consolidando…" : "Consolidar participações"}</button>
    </form>}
    {disabled && <p className="rounded-md bg-green-50 p-3 font-medium text-green-900">Participações já consolidadas. Os resultados e certificados são históricos.</p>}
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 rounded-md p-3 text-sm ${state.status === "error" ? "bg-amber-50 text-amber-950" : "bg-green-50 text-green-900"}`}>{state.message}</p>}
    {state.result && <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4"><p>Participantes: <strong>{state.result.totalParticipantes}</strong></p><p>Concluídos: <strong>{state.result.concluidos}</strong></p><p>Não concluídos: <strong>{state.result.naoConcluidos}</strong></p><p>Certificados emitidos: <strong>{state.result.certificadosEmitidos}</strong></p></div>}
  </div>;
}
