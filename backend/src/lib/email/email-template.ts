export type EmailMessage = { subject: string; title: string; paragraphs: string[]; link?: { label: string; href: string } };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function renderEmail(message: EmailMessage, institution = process.env.CERTIFICATE_INSTITUTION_NAME?.trim() || "Plataforma de Eventos") {
  const institutionText = escapeHtml(institution);
  const paragraphs = message.paragraphs.map((text) => `<p style="line-height:1.6">${escapeHtml(text)}</p>`).join("");
  const link = message.link
    ? `<p><a href="${escapeHtml(message.link.href)}">${escapeHtml(message.link.label)}</a></p>`
    : "";
  const text = [message.title, ...message.paragraphs, ...(message.link ? [`${message.link.label}: ${message.link.href}`] : []), institution].join("\n\n");
  return {
    subject: message.subject,
    text,
    html: `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#172033"><main style="max-width:600px;margin:auto;padding:24px"><p style="color:#526179">${institutionText}</p><h1>${escapeHtml(message.title)}</h1>${paragraphs}${link}<hr><p>${institutionText}</p></main></body></html>`,
  };
}
