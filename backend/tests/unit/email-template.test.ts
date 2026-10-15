import { describe, expect, it } from "vitest";
import { renderEmail } from "@backend/lib/email/email-template";
import { applicationLink } from "@backend/lib/email/email-service";

describe("template simples de e-mail", () => {
  it("gera HTML e texto escapando conteúdo e incluindo identificação institucional", () => {
    const rendered = renderEmail({ subject: "Aviso", title: "Olá <script>", paragraphs: ["A & B"], link: { label: "Abrir", href: "https://example.test/x?a=1&b=2" } }, "Instituição");
    expect(rendered.subject).toBe("Aviso");
    expect(rendered.html).toContain("Instituição");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain("A &amp; B");
    expect(rendered.text).toContain("https://example.test/x?a=1&b=2");
  });

  it("constrói links somente na origem HTTP(S) configurada", () => {
    const original = process.env.APP_URL;
    try {
      process.env.APP_URL = "https://events.example.org";
      expect(applicationLink("/login", "Entrar")?.href).toBe("https://events.example.org/login");
      expect(applicationLink("//evil.example", "link")).toBeUndefined();
      process.env.APP_URL = "javascript:alert(1)";
      expect(applicationLink("/login", "Entrar")).toBeUndefined();
    } finally {
      if (original === undefined) delete process.env.APP_URL; else process.env.APP_URL = original;
    }
  });
});
