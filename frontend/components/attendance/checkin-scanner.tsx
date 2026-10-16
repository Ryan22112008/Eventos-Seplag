"use client";

import Link from "next/link";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useRef, useState } from "react";
import { checkInWithQrAction } from "@backend/server/actions/attendance";

type ScannerState = "idle" | "starting" | "scanning" | "validating" | "success" | "already" | "error";
const messages: Record<string, string> = {
  token_invalid: "Este QR Code não é válido ou foi substituído.", token_expired: "O QR Code expirou. Peça ao organizador para gerar outro.",
  session_not_open: "O período de check-in desta sessão ainda não começou.", session_closed: "Esta sessão não está aceitando presença no momento.",
  not_enrolled: "Você não possui uma inscrição ativa neste evento.", already_present: "Sua presença já foi registrada.",
  forbidden: "Entre com uma conta de participante ativa para fazer check-in.", rate_limited: "Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.",
};

export function CheckinScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const processingRef = useRef(false);
  const [state, setState] = useState<ScannerState>("idle");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<{ eventTitle: string; sessionName: string; registeredAt: Date | string } | null>(null);

  function stopCamera() { controlsRef.current?.stop(); controlsRef.current = null; }

  async function handleToken(token: string) {
    if (processingRef.current) return;
    processingRef.current = true; stopCamera(); setState("validating"); setMessage("Validando sua presença…");
    try {
      const result = await checkInWithQrAction(token);
      if (!result.ok && result.code === "already_present") { setState("already"); setMessage(messages[result.code]); }
      else if (!result.ok) { setState("error"); setMessage(messages[result.code] ?? "Não foi possível validar este QR Code."); }
      else { setState("success"); setDetails(result); setMessage("Presença registrada com sucesso."); }
    } catch { setState("error"); setMessage("Não foi possível conectar ao serviço de check-in. Tente novamente."); }
  }

  async function startCamera() {
    setState("starting"); setMessage("Solicitando acesso à câmera…"); setDetails(null); processingRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia) { setState("error"); setMessage("Este navegador não oferece acesso à câmera. Use um navegador atualizado em uma conexão segura (HTTPS)."); return; }
    const video = videoRef.current;
    if (!video) { setState("error"); setMessage("Não foi possível preparar a câmera. Atualize a página e tente novamente."); return; }
    try {
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => { if (result) void handleToken(result.getText()); });
      controlsRef.current = controls;
      setState("scanning"); setMessage("Câmera ativa. Aponte para o QR Code da sessão.");
    } catch (error) {
      setState("error");
      const name = error instanceof Error ? error.name : "";
      setMessage(name === "NotAllowedError" ? "A permissão da câmera foi negada. Habilite-a nas configurações do navegador." : "Não foi possível iniciar a câmera. Verifique se ela está disponível e tente novamente.");
    }
  }

  const terminal = state === "success" || state === "already";
  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <p className="text-sm text-slate-600">Permita o acesso à câmera quando solicitado e aponte para o QR Code exibido pelo organizador.</p>
    <video ref={videoRef} muted playsInline className={`mt-4 aspect-video w-full rounded-lg bg-slate-950 object-cover ${state === "scanning" || state === "starting" ? "block" : "hidden"}`} aria-label="Prévia da câmera para leitura do QR Code" />
    <p className="mt-4 text-sm" aria-live="polite" role={state === "error" ? "alert" : "status"}>{message}</p>
    {details && <div className="mt-4 rounded-lg bg-green-50 p-4 text-green-950"><p className="font-semibold">{details.eventTitle}</p><p>{details.sessionName}</p><p className="mt-1 text-sm">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(details.registeredAt instanceof Date ? details.registeredAt : new Date(details.registeredAt))}</p></div>}
    <div className="mt-5 flex flex-wrap gap-3">
      {(state === "idle" || state === "error" || terminal) && <button type="button" onClick={startCamera} className="rounded-md bg-blue-800 px-5 py-3 font-semibold text-white">{terminal ? "Ler outro QR Code" : state === "error" ? "Tentar novamente" : "Iniciar câmera"}</button>}
      {(state === "starting" || state === "scanning") && <button type="button" onClick={() => { stopCamera(); setState("idle"); setMessage("Leitura pausada."); }} className="rounded-md border border-slate-300 px-5 py-3 font-semibold">Parar câmera</button>}
      {terminal && <Link href="/participante" className="rounded-md border border-slate-300 px-5 py-3 font-semibold">Voltar às inscrições</Link>}
    </div>
  </section>;
}
