"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useState } from "react";
import { issueTicketQrAction } from "@backend/server/actions/attendance";

export function TicketQr({ registrationId }: { registrationId: string }) {
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function issue() {
    setBusy(true); setMessage(""); setImage(null);
    try {
      const result = await issueTicketQrAction(registrationId);
      if (!result.ok) { setMessage(result.code === "ticket_cancelled" ? "Inscrições canceladas não têm ingresso ativo." : "Não foi possível gerar o QR Code. Tente novamente."); return; }
      setImage(await QRCode.toDataURL(result.token, { errorCorrectionLevel: "H", margin: 2, width: 320 }));
    } catch { setMessage("Não foi possível gerar o QR Code. Verifique sua conexão e tente novamente."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-xl font-semibold">QR Code do ingresso</h2>
    <p className="mt-2 text-sm text-slate-600">Este código identifica seu ingresso. A validação é feita pelo servidor. Não compartilhe uma captura de tela do código.</p>
    {image ? <div className="mt-4 flex flex-col items-center"><Image src={image} alt="QR Code seguro do ingresso" width={320} height={320} unoptimized /><button type="button" onClick={issue} disabled={busy} className="mt-3 rounded-md border px-4 py-2 text-sm hover:bg-slate-50">{busy ? "Gerando…" : "Gerar novo QR Code"}</button></div> : <button type="button" onClick={issue} disabled={busy} className="mt-4 rounded-md bg-blue-800 px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Gerando…" : "Exibir ingresso digital"}</button>}
    {message && <p role="alert" className="mt-3 text-sm text-red-800">{message}</p>}
  </section>;
}
