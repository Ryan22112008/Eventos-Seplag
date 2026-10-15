"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { rotateSessionQrAction } from "@backend/server/actions/attendance";

export function SessionQrPanel({ eventoId, sessaoId, qrConfigured }: { eventoId: string; sessaoId: string; qrConfigured: boolean }) {
  const [qr, setQr] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (qr) void QRCode.toDataURL(qr, { errorCorrectionLevel: "H", margin: 2, width: 520 }).then((url) => { if (active) setImage(url); }).catch(() => { if (active) setMessage("Não foi possível desenhar o QR Code."); });
    else setImage(null);
    return () => { active = false; };
  }, [qr]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) { setQr(null); setExpiresAt(null); setMessage("QR Code expirado. Gere outro antes de continuar o check-in."); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  async function rotate() {
    setBusy(true); setMessage("");
    try {
      const result = await rotateSessionQrAction({ eventoId, sessaoId });
      if (!result.ok) { setQr(null); setMessage(result.code === "rate_limited" ? "Aguarde antes de gerar outro QR Code." : "Não foi possível gerar o QR Code desta sessão."); }
      else { setQr(result.token); setExpiresAt(result.expiresAtMs); setSecondsLeft(120); }
    } catch { setMessage("Falha de conexão ao gerar o QR Code."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-xl font-semibold">QR Code de check-in</h2>
    <p className="mt-2 text-sm text-slate-600">O código é temporário e serve somente para registrar presença nesta sessão. Gere outro para invalidar o anterior.</p>
    {qrConfigured && !qr && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-950">Há um hash de QR salvo; o código pode estar expirado ou ter sido emitido em outro acesso. Gere um novo para usar.</p>}
    {image && <div className="qr-code-surface mt-5 flex flex-col items-center rounded-lg p-3"><Image src={image} alt="QR Code temporário da sessão" width={520} height={520} unoptimized className="w-full max-w-[32rem]" /><p className="mt-2 text-lg font-semibold tabular-nums" aria-live="polite">Expira em {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</p></div>}
    <button type="button" onClick={rotate} disabled={busy} className="mt-4 rounded-md bg-blue-800 px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Gerando…" : qr ? "Rotacionar QR Code" : "Gerar QR Code"}</button>
    {message && <p className="mt-3 text-sm text-amber-900" role="status">{message}</p>}
  </section>;
}
