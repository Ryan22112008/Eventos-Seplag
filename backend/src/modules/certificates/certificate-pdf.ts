import "server-only";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { z } from "zod";

const configSchema = z.object({
  CERTIFICATE_INSTITUTION_NAME: z.string().trim().min(1).max(160),
  CERTIFICATE_TEXT: z.string().trim().min(1).max(1200),
  BASE_URL: z.url(),
  CERTIFICATE_LOGO_PATH: z.string().trim().optional(),
});

export class CertificateConfigurationError extends Error {
  constructor() {
    super("Configure os dados institucionais do certificado no ambiente do servidor.");
    this.name = "CertificateConfigurationError";
  }
}

export type CertificateSettings = {
  institutionName: string;
  institutionalText: string;
  baseUrl: string;
  logo?: Buffer;
};

export async function getCertificateSettings(environment: Readonly<Record<string, string | undefined>> = process.env): Promise<CertificateSettings> {
  const parsed = configSchema.safeParse(environment);
  if (!parsed.success) throw new CertificateConfigurationError();
  const settings: CertificateSettings = {
    institutionName: parsed.data.CERTIFICATE_INSTITUTION_NAME,
    institutionalText: parsed.data.CERTIFICATE_TEXT,
    baseUrl: parsed.data.BASE_URL.replace(/\/+$/, ""),
  };
  if (environment.NODE_ENV === "production" && !settings.baseUrl.startsWith("https://")) throw new CertificateConfigurationError();
  const logoPath = parsed.data.CERTIFICATE_LOGO_PATH;
  if (logoPath) {
    const path = resolve(logoPath);
    if (!/\.(png|jpe?g)$/i.test(path)) throw new CertificateConfigurationError();
    try {
      const details = await stat(path);
      if (!details.isFile() || details.size === 0 || details.size > 5 * 1024 * 1024) throw new CertificateConfigurationError();
      settings.logo = await readFile(path);
    } catch (error) {
      if (error instanceof CertificateConfigurationError) throw error;
      throw new CertificateConfigurationError();
    }
  }
  return settings;
}

export type CertificatePdfInput = CertificateSettings & {
  participantName: string;
  eventTitle: string;
  eventStart: Date;
  eventEnd: Date;
  workloadHours: string;
  issuedAt: Date;
  code: string;
};

const formatDate = (date: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Cuiaba" }).format(date);

export function buildCertificateValidationUrl(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/certificados/validar/${encodeURIComponent(code)}`;
}

export async function renderCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 52, info: { Title: `Certificado - ${input.eventTitle}`, Author: input.institutionName, Subject: `Certificado ${input.code}` } });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolveBuffer, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolveBuffer(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  try {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    doc.save().lineWidth(2).strokeColor("#1e3a5f").roundedRect(28, 28, pageWidth - 56, pageHeight - 56, 12).stroke().restore();
    if (input.logo) doc.image(input.logo, 62, 48, { fit: [88, 76], align: "center", valign: "center" });
    doc.fillColor("#1e3a5f").font("Helvetica-Bold").fontSize(15).text(input.institutionName, input.logo ? 164 : 70, 62, { width: input.logo ? pageWidth - 234 : pageWidth - 140, align: input.logo ? "left" : "center" });
    doc.moveDown(2.5).fillColor("#10243a").font("Helvetica-Bold").fontSize(30).text("CERTIFICADO", 65, 136, { width: pageWidth - 130, align: "center", characterSpacing: 2 });

    doc.fillColor("#475569").font("Helvetica-Bold").fontSize(10).text("PARTICIPANTE", 90, 202, { width: pageWidth - 180, align: "center" });
    doc.fillColor("#10243a").font("Helvetica-Bold").fontSize(25).text(input.participantName, 80, 222, { width: pageWidth - 160, height: 42, align: "center", ellipsis: true });
    const body = input.institutionalText
      .replaceAll("{{participante}}", input.participantName)
      .replaceAll("{{evento}}", input.eventTitle)
      .replaceAll("{{cargaHoraria}}", input.workloadHours);
    doc.fillColor("#334155").font("Helvetica").fontSize(13).text(body, 104, 274, { width: pageWidth - 208, height: 74, align: "center", lineGap: 5, ellipsis: true });

    doc.fillColor("#1e3a5f").font("Helvetica-Bold").fontSize(12).text(input.eventTitle, 72, 368, { width: pageWidth - 144, align: "center" });
    doc.fillColor("#475569").font("Helvetica").fontSize(11).text(`Período: ${formatDate(input.eventStart)} a ${formatDate(input.eventEnd)} · Carga horária: ${input.workloadHours} horas`, 72, 390, { width: pageWidth - 144, align: "center" });
    doc.text(`Emitido em ${formatDate(input.issuedAt)}`, 72, 414, { width: pageWidth - 144, align: "center" });

    const validationUrl = buildCertificateValidationUrl(input.baseUrl, input.code);
    const qr = await QRCode.toBuffer(validationUrl, { type: "png", errorCorrectionLevel: "H", margin: 1, width: 320 });
    doc.image(qr, pageWidth - 150, pageHeight - 150, { width: 82, height: 82 });
    doc.fillColor("#475569").font("Helvetica").fontSize(7).text(`Validar certificado · ${input.code}`, pageWidth - 185, pageHeight - 61, { width: 142, align: "center" });
    doc.end();
    return await completed;
  } catch (error) {
    doc.destroy(error instanceof Error ? error : new Error("Falha ao gerar PDF do certificado."));
    throw error;
  }
}
