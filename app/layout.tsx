import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Eventos SEPLAG", description: "Plataforma institucional de gestão de eventos." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
