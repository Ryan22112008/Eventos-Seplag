"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@backend/auth/access";
import { createEvent, deleteEvent, transitionEvent, updateEvent } from "@backend/modules/events/event-service";
import { saveDiscipline, deleteDiscipline } from "@backend/modules/events/discipline-service";
import { saveSession, deleteSession } from "@backend/modules/events/session-service";
import { removeEventAsset } from "@backend/modules/events/asset-service";

function value(form: FormData, key: string) { return form.get(key)?.toString() ?? ""; }
function eventFields(form: FormData) {
  return {
    titulo: value(form, "titulo"), descricao: value(form, "descricao"), dataInicio: value(form, "dataInicio"), dataTermino: value(form, "dataTermino"),
    local: value(form, "local") || null, cidade: value(form, "cidade") || null, urlGoogleMaps: value(form, "urlGoogleMaps"),
    latitude: value(form, "latitude"), longitude: value(form, "longitude"), modalidade: value(form, "modalidade"), nicho: value(form, "nicho"),
    vagasTotais: value(form, "vagasTotais"), cargaHoraria: value(form, "cargaHoraria"), percentualMinimoPresenca: value(form, "percentualMinimoPresenca"),
    aceitaSubmissaoTrabalhos: form.get("aceitaSubmissaoTrabalhos") === "on",
    inicioSubmissaoTrabalhos: value(form, "inicioSubmissaoTrabalhos"), fimSubmissaoTrabalhos: value(form, "fimSubmissaoTrabalhos"),
  };
}

export async function createEventAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  try { const event = await createEvent(actor, eventFields(form)); redirect(`/organizador/eventos/${event.id}?salvo=1`); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect("/organizador/eventos/novo?erro=dados"); }
}

export async function updateEventAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN"); const eventoId = value(form, "eventoId");
  try { await updateEvent(actor, eventoId, eventFields(form)); redirect(`/organizador/eventos/${eventoId}?salvo=1`); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(`/organizador/eventos/${eventoId}?erro=dados`); }
}

export async function transitionEventAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN"); const eventoId = value(form, "eventoId");
  try { await transitionEvent(actor, eventoId, value(form, "status")); redirect(`/organizador/eventos/${eventoId}?salvo=status`); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(`/organizador/eventos/${eventoId}?erro=status`); }
}

export async function deleteEventAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN");
  try { await deleteEvent(actor, value(form, "eventoId")); redirect("/organizador/eventos?excluido=1"); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(`/organizador/eventos/${value(form, "eventoId")}?erro=exclusao`); }
}

export async function saveDisciplineAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN"); const eventoId = value(form, "eventoId");
  try { await saveDiscipline(actor, eventoId, value(form, "disciplinaId") || null, { nome: value(form, "nome"), cargaHoraria: value(form, "cargaHoraria") }); redirect(`/organizador/eventos/${eventoId}?salvo=disciplina`); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(`/organizador/eventos/${eventoId}?erro=disciplina`); }
}

export async function deleteDisciplineAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN"); const eventoId = value(form, "eventoId");
  try { await deleteDiscipline(actor, eventoId, value(form, "disciplinaId")); redirect(`/organizador/eventos/${eventoId}?salvo=disciplina`); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(`/organizador/eventos/${eventoId}?erro=disciplina`); }
}

export async function saveSessionAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN"); const eventoId = value(form, "eventoId");
  try { await saveSession(actor, eventoId, value(form, "sessaoId") || null, { nome: value(form, "nome"), inicio: value(form, "inicio"), fim: value(form, "fim") }); redirect(`/organizador/eventos/${eventoId}?salvo=sessao`); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(`/organizador/eventos/${eventoId}?erro=sessao`); }
}

export async function deleteSessionAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN"); const eventoId = value(form, "eventoId");
  try { await deleteSession(actor, eventoId, value(form, "sessaoId")); redirect(`/organizador/eventos/${eventoId}?salvo=sessao`); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(`/organizador/eventos/${eventoId}?erro=sessao`); }
}

export async function deleteAssetAction(form: FormData) {
  const actor = await requireRole("ORGANIZADOR", "ADMIN"); const eventoId = value(form, "eventoId");
  try { await removeEventAsset(actor, eventoId, value(form, "asset")); redirect(`/organizador/eventos/${eventoId}?salvo=arquivo`); }
  catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; redirect(`/organizador/eventos/${eventoId}?erro=arquivo`); }
}
