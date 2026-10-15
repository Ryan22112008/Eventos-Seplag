import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { renderEmail, type EmailMessage } from "./email-template";

export interface EmailService {
  send(to: string, message: EmailMessage): Promise<boolean>;
}

let transport: Transporter | null = null;
let transportKey = "";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !SMTP_FROM() || !Number.isInteger(port) || port < 1 || port > 65535 || Boolean(SMTP_USER) !== Boolean(SMTP_PASSWORD)) return null;
  const key = [SMTP_HOST, port, SMTP_USER ?? "", SMTP_PASSWORD ?? "", process.env.SMTP_SECURE ?? "false"].join("\u0000");
  if (!transport || transportKey !== key) {
    transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true",
      ...(SMTP_USER && SMTP_PASSWORD ? { auth: { user: SMTP_USER, pass: SMTP_PASSWORD } } : {}),
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
    });
    transportKey = key;
  }
  return transport;
}

function SMTP_FROM() { return process.env.SMTP_FROM?.trim(); }

export function applicationLink(path: string, label: string) {
  try {
    const base = process.env.APP_URL?.trim();
    if (!base) return undefined;
    const baseUrl = new URL(base);
    if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") return undefined;
    const destination = new URL(path, baseUrl);
    if (destination.origin !== baseUrl.origin) return undefined;
    return { label, href: destination.toString() };
  } catch { return undefined; }
}

export async function sendEmail(to: string, message: EmailMessage): Promise<boolean> {
  try {
    const mailTransport = getTransport();
    const from = SMTP_FROM();
    if (!mailTransport || !from) {
      console.error("E-mail transacional não enviado: configuração SMTP incompleta.");
      return false;
    }
    await mailTransport.sendMail({ from, to, ...renderEmail(message) });
    return true;
  } catch (error) {
    // Deliberately omit the SMTP error object, recipients, content and credentials.
    console.error("Falha no envio de e-mail transacional.", { error: error instanceof Error ? error.name : "UnknownError" });
    return false;
  }
}

export const emailService: EmailService = { send: sendEmail };

export async function sendEmailToActiveAdmins(message: EmailMessage) {
  try {
    const { prisma } = await import("@backend/lib/prisma");
    const admins = await prisma.usuario.findMany({ where: { perfil: "ADMIN", ativo: true }, select: { email: true } });
    if (admins.length === 0) {
      console.error("E-mail administrativo não enviado: não há administradores ativos configurados.");
      return false;
    }
    const results = await Promise.all(admins.map(({ email }) => sendEmail(email, message)));
    return results.every(Boolean);
  } catch (error) {
    console.error("Falha ao localizar destinatários administrativos para e-mail transacional.", { error: error instanceof Error ? error.name : "UnknownError" });
    return false;
  }
}
